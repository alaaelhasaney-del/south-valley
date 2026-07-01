import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ====== CONFIG ======
const BUCKET = "images";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function guessMimeFromDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,/i);
  return (m && m[1]) || "";
}

function dataUrlToBuffer(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.*)$/i);
  if (!m) throw new Error("Invalid data URL");
  const base64 = m[2];
  return Buffer.from(base64, "base64");
}

function getExtensionFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "image/heic") return "heic";
  if (m === "image/heif") return "heif";
  return "jpg";
}

function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return [1e7] + -1e3 + -4e3 + -8e3 + -1e11; // fallback; not cryptographically perfect
}

function buildObjectPath({ studentId, mime, fileName }) {
  const ext = getExtensionFromMime(mime) || "jpg";
  return `students/${studentId}/${uuidV4()}.${ext}`;
}

async function uploadOne({ supabase, clientRow, dryRun }) {
  const studentId = clientRow.id;
  const photoData = clientRow.photo_data;

  if (!photoData)
    return { skipped: true, studentId, reason: "empty photo_data" };
  if (typeof photoData !== "string")
    return { skipped: true, studentId, reason: "photo_data not string" };
  if (!photoData.startsWith("data:") || !photoData.includes(";base64,")) {
    return {
      skipped: true,
      studentId,
      reason: "photo_data not a base64 data URL",
    };
  }

  const mime = guessMimeFromDataUrl(photoData) || "image/jpeg";
  const buffer = dataUrlToBuffer(photoData);

  const objectPath = buildObjectPath({
    studentId,
    mime,
    fileName: `student-${studentId}`,
  });

  if (dryRun) {
    return {
      skipped: false,
      studentId,
      objectPath,
      uploaded: false,
      dryRun: true,
    };
  }

  const uploadRes = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadRes.error) {
    throw new Error(
      `Storage upload failed for student_id=${studentId}: ${uploadRes.error.message}`,
    );
  }

  // For Private bucket: store objectPath only
  return { skipped: false, studentId, objectPath, uploaded: true };
}

async function main() {
  const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
  const SUPABASE_ANON_KEY = requireEnv("VITE_SUPABASE_ANON_KEY");

  const dryRun = process.argv.includes("--dry-run");
  const purgeOld = process.argv.includes("--purge-old");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  console.log(
    "=== Supabase Photo Migration: students.photo_data -> Storage(images) ===",
  );
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Mode: ${dryRun ? "DRY_RUN (no DB/storage changes)" : "LIVE"}`);
  console.log(`purgeOld: ${purgeOld}`);

  const { data: rows, error } = await supabase
    .from("students")
    .select("id, photo_data")
    .order("id", { ascending: true });

  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  console.log(`Fetched students: ${rows?.length || 0}`);

  const results = {
    total: rows?.length || 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Sequential to keep load safe. Can parallelize later with concurrency limit.
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const studentId = row.id;

    try {
      // Skip if already migrated (image_url exists)
      const { data: check } = await supabase
        .from("students")
        .select("image_url")
        .eq("id", studentId)
        .maybeSingle();

      if (check?.image_url) {
        results.skipped++;
        if (idx % 50 === 0)
          console.log(
            `[${idx + 1}/${rows.length}] student_id=${studentId} already has image_url. Skipping.`,
          );
        continue;
      }

      const uploadResult = await uploadOne({
        supabase,
        clientRow: row,
        dryRun,
      });

      if (uploadResult.skipped) {
        results.skipped++;
        if (idx % 50 === 0)
          console.log(
            `[${idx + 1}/${rows.length}] student_id=${studentId} skipped: ${uploadResult.reason}`,
          );
        continue;
      }

      if (!uploadResult.uploaded && dryRun) {
        console.log(
          `[${idx + 1}/${rows.length}] student_id=${studentId} DRY_RUN would upload to: ${uploadResult.objectPath}`,
        );
        results.skipped++;
        continue;
      }

      const objectPath = uploadResult.objectPath;

      if (dryRun) continue;

      // Update DB only after successful upload
      const updateRes = await supabase
        .from("students")
        .update({ image_url: objectPath })
        .eq("id", studentId)
        .select("id, image_url")
        .single();

      if (updateRes.error) {
        throw new Error(
          `DB update failed for student_id=${studentId}: ${updateRes.error.message}`,
        );
      }

      results.migrated++;
      console.log(
        `✅ [${idx + 1}/${rows.length}] student_id=${studentId} migrated -> ${objectPath}`,
      );

      if (purgeOld) {
        // Delete old base64 after migration success
        const delRes = await supabase
          .from("students")
          .update({ photo_data: null })
          .eq("id", studentId);
        if (delRes.error) {
          console.warn(
            `⚠️ Purge old failed for student_id=${studentId}: ${delRes.error.message}`,
          );
        }
      }

      // Keep DB/storage load safe
      if (idx % 25 === 0) await sleep(150);
    } catch (e) {
      results.failed++;
      const msg = e?.message || String(e);
      results.errors.push({ studentId, error: msg });
      console.error(
        `❌ [${idx + 1}/${rows.length}] student_id=${studentId} failed: ${msg}`,
      );

      // Continue migration even if one row fails
      continue;
    }
  }

  console.log("=== Migration Summary ===");
  console.log(JSON.stringify(results, null, 2));

  if (results.errors.length > 0) {
    const outFile = path.join(__dirname, "migration-errors.json");
    fs.writeFileSync(outFile, JSON.stringify(results.errors, null, 2));
    console.log(`Saved error details to: ${outFile}`);
  }
}

main().catch((e) => {
  console.error("Fatal migration error:", e?.message || e);
  process.exit(1);
});
