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
      email,
      password,
      tenant_id,
      role: newRole,
      branch_ids,
      name,
      status,
      is_approved,
    } = body || {};

    if (!email || !password || !newRole) {
      return new Response(
        JSON.stringify({ error: "email, password, role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const branchIds = Array.isArray(branch_ids) ? branch_ids : [];
    const primaryBranch = branchIds.length ? branchIds[0] : null;
    const tenantId = tenant_id ?? 1;

    // Check orphan: existing public.users row with same email
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    // Create auth user
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: name || "",
          tenant_id: tenantId,
          role: newRole,
          branch_ids: branchIds,
        },
      });

    if (createAuthError) {
      console.error("admin-create-user auth error:", createAuthError);
      return new Response(
        JSON.stringify({
          error: createAuthError.message || "Failed to create auth user",
          details: { ...createAuthError },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authUserId = authData.user.id;

    // If orphan exists with different id, delete it to satisfy FK(users.id -> auth.users.id)
    if (existingUser?.id && existingUser.id !== authUserId) {
      await supabaseAdmin.from("users").delete().eq("id", existingUser.id);
    }

    // Insert profile row (do NOT update users.id / PK)
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: authUserId,
      name: name || "",
      email: cleanEmail,
      role: newRole,
      tenant_id: tenantId,
      branch_ids: branchIds,
      branch_id: primaryBranch,
      status: status || "active",
      is_approved: is_approved ?? true,
      photo_url: body.photo_url ?? null,
      password_hash: null,
    });

    if (insertError) {
      console.error("admin-create-user insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: insertError.message || "Failed to insert user profile",
          details: { ...insertError },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ user_id: authUserId }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-create-user unexpected error:", e);
    return new Response(
      JSON.stringify({
        error: e?.message || String(e),
        details: e,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
