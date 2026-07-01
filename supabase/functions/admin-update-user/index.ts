import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenUser, error: tokenUserErr } =
      await supabaseAdmin.auth.getUser(token);
    if (tokenUserErr || !tokenUser?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = tokenUser.user.id;

    const { data: requesterRow, error: requesterErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", requesterId)
      .single();

    if (requesterErr || !requesterRow) {
      return new Response(JSON.stringify({ error: "Requester not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = requesterRow.role;
    const isAdmin =
      role === "admin" ||
      role === "system admin" ||
      role === "system_admin" ||
      role === "general manager" ||
      role === "general_manager" ||
      role === "مدير عام";

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      userId,
      email,
      password,
      role: newRole,
      branch_ids,
      name,
      status,
      is_approved,
      tenant_id,
      photo_url,
    } = body || {};

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify exists in auth
    const { data: authUser, error: fetchAuthErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchAuthErr || !authUser?.user) {
      return new Response(JSON.stringify({ error: "User not found in auth" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth
    const authUpdatePayload: Record<string, unknown> = {};
    if (email) authUpdatePayload.email = String(email).trim();
    if (password) authUpdatePayload.password = password;
    authUpdatePayload.user_metadata = {
      name: name || "",
      role: newRole,
      branch_ids: Array.isArray(branch_ids) ? branch_ids : [],
    };

    await supabaseAdmin.auth.admin.updateUserById(userId, authUpdatePayload);

    const branchIds = Array.isArray(branch_ids) ? branch_ids : [];
    const primaryBranch = branchIds.length ? branchIds[0] : null;
    const tenantIdFinal = tenant_id ?? 1;

    // Update public.users profile (DO NOT update id)
    await supabaseAdmin
      .from("users")
      .update({
        name: name ?? null,
        email: email ? String(email).trim() : null,
        role: newRole,
        tenant_id: tenantIdFinal,
        branch_ids: branchIds,
        branch_id: primaryBranch,
        status: status ?? "pending",
        is_approved: is_approved ?? false,
        photo_url: photo_url ?? null,
        // password_hash cannot be reliably re-hashed here without bcrypt.
        // Keep null / existing value as-is (no password_hash update).
      })
      .eq("id", userId);

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
