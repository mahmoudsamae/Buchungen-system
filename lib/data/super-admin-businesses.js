import { createAdminClient } from "@/lib/supabase/admin";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function mapAvailabilityRules(rules) {
  if (!rules?.length) return [];
  const byDay = {};
  for (const r of rules) {
    const day = WEEKDAYS[r.weekday] || String(r.weekday);
    if (!byDay[day]) byDay[day] = { day, slots: [] };
    const start = String(r.start_time).slice(0, 5);
    const end = String(r.end_time).slice(0, 5);
    byDay[day].slots.push({ time: `${start}–${end}`, enabled: r.is_active, id: r.id });
  }
  return Object.values(byDay);
}

function mapBookingRow(b, profile) {
  const tn = profile?.full_name || "Customer";
  return {
    id: b.id,
    customer: tn,
    service: "—",
    date: b.booking_date,
    time: String(b.start_time).slice(0, 5),
    status: b.status
  };
}

export async function listAllBusinessesAdmin() {
  const admin = createAdminClient();
  const { data: businesses, error } = await admin.from("businesses").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  const { data: counts } = await admin.from("business_users").select("business_id, role");
  const customerCount = {};
  const staffCount = {};
  for (const row of counts || []) {
    if (row.role === "customer") customerCount[row.business_id] = (customerCount[row.business_id] || 0) + 1;
    else staffCount[row.business_id] = (staffCount[row.business_id] || 0) + 1;
  }

  const { data: bookingAgg } = await admin.from("bookings").select("business_id");
  const bookingCount = {};
  for (const row of bookingAgg || []) {
    bookingCount[row.business_id] = (bookingCount[row.business_id] || 0) + 1;
  }

  const { data: mgrRows } = await admin
    .from("business_users")
    .select("business_id, status, profiles(email, full_name)")
    .eq("role", "manager");
  const managerByBiz = {};
  for (const m of mgrRows || []) {
    managerByBiz[m.business_id] = {
      email: m.profiles?.email || "",
      fullName: m.profiles?.full_name || "",
      status: m.status || "active"
    };
  }

  return (businesses || []).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    email: b.email,
    phone: b.phone,
    status: b.status,
    createdAt: b.created_at?.slice(0, 10),
    customerCount: customerCount[b.id] || 0,
    totalBookings: bookingCount[b.id] || 0,
    totalUsers: (staffCount[b.id] || 0) + (customerCount[b.id] || 0),
    manager: managerByBiz[b.id] || { email: "", fullName: "" }
  }));
}

export async function getBusinessDetailAdmin(businessId) {
  const admin = createAdminClient();
  const { data: business, error: be } = await admin.from("businesses").select("*").eq("id", businessId).maybeSingle();
  if (be) throw be;
  if (!business) return null;

  const { data: team } = await admin
    .from("business_users")
    .select("id, user_id, role, status, created_at, profiles(full_name, email)")
    .eq("business_id", businessId);

  const managerRow = (team || []).find((t) => t.role === "manager");
  const prof = managerRow?.profiles;

  const manager = managerRow
    ? {
        id: managerRow.user_id,
        fullName: prof?.full_name || "",
        email: prof?.email || "",
        username: null,
        status: managerRow.status,
        loginDisabled: false,
        forcePasswordChange: false
      }
    : {
        id: "",
        fullName: "",
        email: "",
        username: null,
        status: "inactive"
      };

  if (managerRow?.user_id) {
    const { data: udat } = await admin.auth.admin.getUserById(managerRow.user_id);
    const meta = udat?.user?.user_metadata || {};
    manager.loginDisabled = Boolean(meta.login_disabled);
    manager.forcePasswordChange = Boolean(meta.force_password_change);
  }

  const users = (team || [])
    .filter((t) => t.role !== "customer")
    .map((t) => ({
      id: t.user_id,
      fullName: t.profiles?.full_name || "",
      email: t.profiles?.email || "",
      role: t.role,
      status: t.status,
      createdAt: t.created_at?.slice(0, 10) || ""
    }));

  const { data: bookingRows } = await admin
    .from("bookings")
    .select("id, booking_date, start_time, end_time, status, customer_user_id")
    .eq("business_id", businessId)
    .order("booking_date", { ascending: false })
    .limit(200);

  const custIds = [...new Set((bookingRows || []).map((b) => b.customer_user_id))];
  const { data: custProfiles } = await admin.from("profiles").select("id, full_name").in("id", custIds);
  const nameById = Object.fromEntries((custProfiles || []).map((p) => [p.id, p.full_name]));

  const bookings = (bookingRows || []).map((b) => mapBookingRow(b, { full_name: nameById[b.customer_user_id] || "" }));

  const { data: rules } = await admin.from("availability_rules").select("*").eq("business_id", businessId).order("weekday");

  const customerCount = (team || []).filter((t) => t.role === "customer").length;

  const { count: bookingTotal } = await admin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    email: business.email,
    phone: business.phone,
    status: business.status,
    createdAt: business.created_at?.slice(0, 10),
    slot_duration_minutes: business.slot_duration_minutes,
    customerCount,
    totalBookings: bookingTotal ?? 0,
    totalUsers: (team || []).length,
    manager,
    users,
    bookings,
    services: [],
    availability: mapAvailabilityRules(rules || []),
    settings: {
      timezone: business.timezone,
      autoConfirm: business.auto_confirm_bookings,
      bookingPolicy: business.booking_policy || ""
    }
  };
}

/**
 * Provisions one business tenant: inserts `businesses`, creates the manager via Auth,
 * and links them with `business_users` (role `manager`). Platform owner create-tenant flow.
 */
export async function createBusinessWithManagerAdmin(payload) {
  const admin = createAdminClient();
  const slug = String(payload.slug || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  const password = payload.initialPassword;
  if (!password || String(password).length < 8) {
    const err = new Error("Password must be at least 8 characters.");
    err.code = "VALIDATION";
    throw err;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: String(payload.managerEmail).trim().toLowerCase(),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: String(payload.managerFullName).trim() }
  });

  if (authErr) throw authErr;
  const userId = authData.user.id;

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .insert({
      name: String(payload.name).trim(),
      slug,
      email: String(payload.email).trim(),
      phone: payload.phone ? String(payload.phone).trim() : null,
      status: ["active", "inactive", "suspended"].includes(payload.status) ? payload.status : "active"
    })
    .select()
    .single();

  if (bizErr) {
    await admin.auth.admin.deleteUser(userId);
    throw bizErr;
  }

  const { error: buErr } = await admin.from("business_users").insert({
    business_id: biz.id,
    user_id: userId,
    role: "manager",
    status: "active"
  });

  if (buErr) {
    await admin.from("businesses").delete().eq("id", biz.id);
    await admin.auth.admin.deleteUser(userId);
    throw buErr;
  }

  const planCode = ["free", "basic", "pro"].includes(payload.plan) ? payload.plan : "free";
  const priceByPlan = { free: 0, basic: 2900, pro: 7900 };
  const { error: subErr } = await admin.from("business_subscriptions").insert({
    business_id: biz.id,
    plan_code: planCode,
    status: "active",
    price_cents: priceByPlan[planCode] ?? 0,
    billing_cycle: "monthly",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  if (subErr) {
    console.warn("[createBusiness] business_subscriptions insert skipped:", subErr.message);
  }

  const { error: pErr } = await admin
    .from("profiles")
    .update({ full_name: String(payload.managerFullName).trim() })
    .eq("id", userId);
  if (pErr) {
    console.warn("profile update", pErr);
  }

  return getBusinessDetailAdmin(biz.id);
}

export async function updateBusinessAdmin(businessId, patch) {
  const admin = createAdminClient();
  const row = {};
  if (patch.name != null) row.name = String(patch.name);
  if (patch.slug != null) row.slug = String(patch.slug).toLowerCase().replace(/\s+/g, "-");
  if (patch.email != null) row.email = String(patch.email);
  if (patch.phone != null) row.phone = String(patch.phone);
  if (patch.status != null && ["active", "inactive", "suspended"].includes(patch.status)) row.status = patch.status;
  if (patch.slot_duration_minutes != null) row.slot_duration_minutes = Number(patch.slot_duration_minutes);

  if (patch.settings && typeof patch.settings === "object") {
    if (patch.settings.timezone != null) row.timezone = String(patch.settings.timezone);
    if (patch.settings.autoConfirm != null) row.auto_confirm_bookings = Boolean(patch.settings.autoConfirm);
    if (patch.settings.bookingPolicy != null) row.booking_policy = String(patch.settings.bookingPolicy);
  }

  if (Object.keys(row).length) {
    const { error } = await admin.from("businesses").update(row).eq("id", businessId);
    if (error) throw error;
  }

  if (patch.manager) {
    const { data: mgr } = await admin
      .from("business_users")
      .select("user_id")
      .eq("business_id", businessId)
      .eq("role", "manager")
      .limit(1)
      .maybeSingle();
    if (mgr?.user_id) {
      const uid = mgr.user_id;
      if (patch.manager.fullName != null) {
        await admin.from("profiles").update({ full_name: String(patch.manager.fullName) }).eq("id", uid);
      }
      if (patch.manager.status != null && ["active", "inactive", "suspended"].includes(patch.manager.status)) {
        await admin.from("business_users").update({ status: patch.manager.status }).eq("business_id", businessId).eq("user_id", uid);
      }
      if (patch.manager.email != null) {
        const email = String(patch.manager.email).trim().toLowerCase();
        const { error: ue } = await admin.auth.admin.updateUserById(uid, { email });
        if (ue) throw ue;
        await admin.from("profiles").update({ email }).eq("id", uid);
      }
    }
  }

  return getBusinessDetailAdmin(businessId);
}

export async function deleteBusinessAdmin(businessId) {
  const admin = createAdminClient();
  const { error } = await admin.from("businesses").delete().eq("id", businessId);
  if (error) throw error;
}

export async function updateManagerSecurityAdmin(businessId, body) {
  const admin = createAdminClient();
  const { data: mgr } = await admin
    .from("business_users")
    .select("user_id")
    .eq("business_id", businessId)
    .eq("role", "manager")
    .limit(1)
    .maybeSingle();
  if (!mgr?.user_id) throw new Error("No manager");

  const uid = mgr.user_id;
  const updates = {};

  if (body.initialPassword && String(body.initialPassword).length >= 8) {
    updates.password = String(body.initialPassword);
  }

  const meta = {};
  if (typeof body.loginDisabled === "boolean") meta.login_disabled = body.loginDisabled;
  if (typeof body.forcePasswordChange === "boolean") meta.force_password_change = body.forcePasswordChange;
  if (Object.keys(meta).length) {
    const { data: existing } = await admin.auth.admin.getUserById(uid);
    const merged = { ...(existing?.user?.user_metadata || {}), ...meta };
    updates.user_metadata = merged;
  }

  if (Object.keys(updates).length) {
    const { error } = await admin.auth.admin.updateUserById(uid, updates);
    if (error) throw error;
  }

  return getBusinessDetailAdmin(businessId);
}
