import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { resolveTeacherPermissions } from "@/lib/manager/teacher-permissions";
import { fetchTeacherSettingsMerged } from "@/lib/data/teacher-settings";

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Aggregated, tenant-scoped metrics for the school (manager) dashboard.
 * Uses service role after route guard has verified manager membership.
 */
export async function getSchoolDashboardInsights(businessId) {
  const admin = createAdminClient();
  const now = new Date();
  const today = iso(now);
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeekMonday(now);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const { data: team, error: teamErr } = await admin
    .from("business_users")
    .select("id, user_id, role, status, created_at, category_id, primary_instructor_user_id")
    .eq("business_id", businessId);
  if (teamErr) throw teamErr;

  const members = team || [];
  const teachers = members.filter((m) => m.role === "staff");
  const managers = members.filter((m) => m.role === "manager");
  const customers = members.filter((m) => m.role === "customer");

  const instructorByCustomer = {};
  for (const c of customers) {
    instructorByCustomer[c.user_id] = c.primary_instructor_user_id || null;
  }

  const { data: bookings, error: bookErr } = await admin
    .from("bookings")
    .select("id, booking_date, start_time, end_time, status, customer_user_id, service_id, created_at")
    .eq("business_id", businessId);
  if (bookErr) throw bookErr;
  const bookRows = bookings || [];

  const activeLike = new Set(["pending", "confirmed"]);

  let totalBookings = bookRows.length;
  let todayBookings = 0;
  let upcomingLessons = 0;
  let completedLessons = 0;
  let cancelledLessons = 0;
  let pendingBookings = 0;
  const bookingsThisWeek = { count: 0 };
  const bookingsPrevWeek = { count: 0 };

  const byInstructor = {};
  const byDay = {};
  const byHour = {};
  const byService = {};

  for (const b of bookRows) {
    const st = normalizeBookingStatus(b.status) || String(b.status || "");
    const dateStr = String(b.booking_date).slice(0, 10);
    if (dateStr === today) todayBookings += 1;

    const bd = new Date(`${dateStr}T12:00:00`);
    if (bd >= weekStart) bookingsThisWeek.count += 1;
    else if (bd >= prevWeekStart && bd < weekStart) bookingsPrevWeek.count += 1;

    if (st === "completed") completedLessons += 1;
    if (st === "cancelled_by_user" || st === "cancelled_by_manager") cancelledLessons += 1;
    if (st === "pending") pendingBookings += 1;

    if (activeLike.has(st)) {
      const start = new Date(`${dateStr}T${String(b.start_time).slice(0, 8)}`);
      if (!Number.isNaN(start.getTime()) && start > now) upcomingLessons += 1;
    }

    const cust = b.customer_user_id;
    const instr = cust ? instructorByCustomer[cust] || null : null;
    const key = instr || "_unassigned";
    byInstructor[key] = (byInstructor[key] || 0) + 1;

    byDay[dateStr] = (byDay[dateStr] || 0) + 1;
    const hh = String(b.start_time).slice(0, 2);
    if (hh) byHour[hh] = (byHour[hh] || 0) + 1;
    const sid = b.service_id || "_none";
    byService[sid] = (byService[sid] || 0) + 1;
  }

  let mostActiveTeacher = { userId: null, name: "—", count: 0 };
  for (const t of teachers) {
    const c = byInstructor[t.user_id] || 0;
    if (c > mostActiveTeacher.count) {
      mostActiveTeacher = { userId: t.user_id, name: "", count: c };
    }
  }
  if (mostActiveTeacher.userId) {
    const { data: p } = await admin.from("profiles").select("full_name").eq("id", mostActiveTeacher.userId).maybeSingle();
    mostActiveTeacher.name = p?.full_name || "Teacher";
  }

  const newStudentsThisMonth = customers.filter((c) => c.created_at && new Date(c.created_at) >= monthStart).length;

  const growthPct =
    bookingsPrevWeek.count === 0
      ? bookingsThisWeek.count > 0
        ? 100
        : 0
      : Math.round(((bookingsThisWeek.count - bookingsPrevWeek.count) / bookingsPrevWeek.count) * 100);

  const completionRate =
    totalBookings > 0 ? Math.round((completedLessons / totalBookings) * 1000) / 10 : null;
  const cancelRate = totalBookings > 0 ? Math.round((cancelledLessons / totalBookings) * 1000) / 10 : null;

  const sortedDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
  const busiestDays = sortedDays.slice(0, 5).map(([date, count]) => ({ date, count }));
  const sortedHours = Object.entries(byHour).sort((a, b) => b[1] - a[1]);
  const busiestHours = sortedHours.slice(0, 5).map(([hour, count]) => ({ hour: `${hour}:00`, count }));

  const serviceIds = [...new Set(bookRows.map((b) => b.service_id).filter(Boolean))];
  const { data: svcRows } = serviceIds.length
    ? await admin.from("services").select("id, name").eq("business_id", businessId).in("id", serviceIds)
    : { data: [] };
  const svcName = Object.fromEntries((svcRows || []).map((s) => [s.id, s.name]));
  const topServices = Object.entries(byService)
    .filter(([k]) => k !== "_none")
    .map(([id, count]) => ({ serviceId: id, name: svcName[id] || "Service", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const teacherIds = teachers.map((t) => t.user_id);
  const { data: teacherProfiles } = teacherIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", teacherIds)
    : { data: [] };
  const nameByTeacher = Object.fromEntries((teacherProfiles || []).map((p) => [p.id, p.full_name || p.email || ""]));
  const emailByTeacher = Object.fromEntries((teacherProfiles || []).map((p) => [p.id, p.email || ""]));

  /** Heuristic: >8 bookings this week → overloaded; <2 in last 30d active → low */
  const teacherLoad = [];
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  for (const t of teachers) {
    const uid = t.user_id;
    const attributed = bookRows.filter((b) => instructorByCustomer[b.customer_user_id] === uid);
    const thisWeek = attributed.filter((b) => new Date(String(b.booking_date).slice(0, 10) + "T12:00:00") >= weekStart).length;
    const last30 = attributed.filter((b) => new Date(String(b.booking_date).slice(0, 10)) >= thirtyAgo).length;
    teacherLoad.push({
      userId: uid,
      name: nameByTeacher[uid] || "Teacher",
      thisWeekCount: thisWeek,
      last30Count: last30,
      overloaded: thisWeek >= 8,
      lowVolume: last30 < 2 && t.status === "active"
    });
  }

  const alerts = [];
  if (pendingBookings > 0) {
    alerts.push({ id: "pending", severity: "warning", title: "Pending bookings", detail: `${pendingBookings} require confirmation or action.` });
  }
  for (const tl of teacherLoad) {
    if (tl.overloaded) {
      alerts.push({
        id: `load-${tl.userId}`,
        severity: "info",
        title: "High weekly load",
        detail: "At least one teacher has 8+ attributed bookings this week."
      });
      break;
    }
  }
  for (const tl of teacherLoad) {
    if (tl.lowVolume) {
      alerts.push({
        id: `low-${tl.userId}`,
        severity: "info",
        title: "Low booking volume",
        detail: "Some active teachers have fewer than 2 attributed bookings in 30 days."
      });
      break;
    }
  }

  const bookingsSeries = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = iso(d);
    bookingsSeries.push({ date: ds, count: byDay[ds] || 0 });
  }

  const lessonsPerTeacher = teachers.map((t) => ({
    userId: t.user_id,
    lessons: byInstructor[t.user_id] || 0
  }));

  /** Per-teacher rows for the Teachers directory (primary-instructor attribution). */
  const teacherDirectory = [];
  for (const t of teachers) {
    const uid = t.user_id;
    const assignedCount = customers.filter((c) => c.primary_instructor_user_id === uid).length;
    const attributed = bookRows.filter((b) => instructorByCustomer[b.customer_user_id] === uid);
    const completedN = attributed.filter((b) => normalizeBookingStatus(b.status) === "completed").length;
    const cancelledN = attributed.filter((b) => {
      const s = normalizeBookingStatus(b.status);
      return s === "cancelled_by_user" || s === "cancelled_by_manager";
    }).length;
    let nextBk = null;
    for (const b of attributed) {
      const st = normalizeBookingStatus(b.status) || "";
      const ds = String(b.booking_date).slice(0, 10);
      if (!activeLike.has(st)) continue;
      const start = new Date(`${ds}T${String(b.start_time).slice(0, 8)}`);
      if (Number.isNaN(start.getTime()) || start < now) continue;
      const timeStr = String(b.start_time).slice(0, 5);
      if (!nextBk || ds < nextBk.date || (ds === nextBk.date && timeStr < nextBk.time)) {
        nextBk = { date: ds, time: timeStr };
      }
    }
    const cancelRate =
      attributed.length > 0 ? Math.round((cancelledN / attributed.length) * 1000) / 10 : null;
    teacherDirectory.push({
      userId: uid,
      fullName: nameByTeacher[uid] || "",
      email: emailByTeacher[uid] || "",
      status: t.status,
      categoryId: t.category_id,
      assignedStudents: assignedCount,
      attributedBookings: attributed.length,
      completedLessons: completedN,
      cancelledLessons: cancelledN,
      cancellationRatePct: cancelRate,
      nextBooking: nextBk,
      utilizationPct: null
    });
  }
  teacherDirectory.sort((a, b) => a.fullName.localeCompare(b.fullName));

  let lowestUtilTeacher = { userId: null, name: "—", lessons: 0 };
  const activeDir = teacherDirectory.filter((r) => r.status === "active");
  if (activeDir.length) {
    const minRow = activeDir.reduce((a, b) => (a.attributedBookings <= b.attributedBookings ? a : b));
    lowestUtilTeacher = {
      userId: minRow.userId,
      name: minRow.fullName || "Teacher",
      lessons: minRow.attributedBookings
    };
  }

  return {
    kpis: {
      totalTeachers: teachers.length,
      totalManagers: managers.length,
      totalStudents: customers.length,
      totalBookings,
      todayBookings,
      upcomingLessons,
      completedLessons,
      cancelledLessons,
      pendingBookings,
      newStudentsThisMonth,
      bookingGrowthRatePct: growthPct,
      mostActiveTeacher,
      lowestUtilTeacher,
      completionRatePct: completionRate,
      cancellationRatePct: cancelRate
    },
    charts: {
      bookingsOver30d: bookingsSeries,
      busiestDays,
      busiestHours,
      topServices,
      lessonsPerTeacher
    },
    operations: {
      teacherLoad,
      pendingBookings,
      busiestDays
    },
    alerts,
    teacherDirectory
  };
}

/**
 * Teacher detail for school admin — staff/manager row in this business only.
 */
export async function getSchoolTeacherDetail(businessId, teacherUserId) {
  const admin = createAdminClient();
  const { data: bu, error: buErr } = await admin
    .from("business_users")
    .select("id, user_id, role, status, category_id, created_at")
    .eq("business_id", businessId)
    .eq("user_id", teacherUserId)
    .in("role", ["staff", "manager"])
    .maybeSingle();
  if (buErr) throw buErr;
  if (!bu) return null;

  const { data: profile } = await admin.from("profiles").select("id, full_name, email, phone").eq("id", teacherUserId).maybeSingle();

  const { data: custRows } = await admin
    .from("business_users")
    .select("user_id, status, created_at, primary_instructor_user_id")
    .eq("business_id", businessId)
    .eq("role", "customer")
    .eq("primary_instructor_user_id", teacherUserId);

  const studentIds = (custRows || []).map((c) => c.user_id);
  const { data: studentProfiles } = studentIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", studentIds)
    : { data: [] };
  const students = (custRows || []).map((c) => {
    const p = (studentProfiles || []).find((x) => x.id === c.user_id);
    return {
      userId: c.user_id,
      fullName: p?.full_name || "",
      email: p?.email || "",
      status: c.status,
      createdAt: c.created_at?.slice(0, 10) || ""
    };
  });

  let bookList = [];
  if (studentIds.length) {
    const { data: bookings } = await admin
      .from("bookings")
      .select("id, booking_date, start_time, end_time, status, customer_user_id, service_id")
      .eq("business_id", businessId)
      .in("customer_user_id", studentIds);
    bookList = (bookings || []).sort((a, b) => String(b.booking_date).localeCompare(String(a.booking_date)));
  }

  const now = new Date();
  const pendingConfirmed = new Set(["pending", "confirmed"]);
  const completed = (bookList || []).filter((b) => normalizeBookingStatus(b.status) === "completed").length;
  const cancelled = (bookList || []).filter((b) => {
    const s = normalizeBookingStatus(b.status);
    return s === "cancelled_by_user" || s === "cancelled_by_manager";
  }).length;
  const upcoming = (bookList || []).filter((b) => {
    const st = normalizeBookingStatus(b.status) || "";
    if (!pendingConfirmed.has(st)) return false;
    const ds = String(b.booking_date).slice(0, 10);
    const start = new Date(`${ds}T${String(b.start_time).slice(0, 8)}`);
    return !Number.isNaN(start.getTime()) && start > now;
  }).length;

  const weekStart = startOfWeekMonday(now);
  let bookedMinutesWeek = 0;
  for (const b of bookList || []) {
    const ds = String(b.booking_date).slice(0, 10);
    const d = new Date(`${ds}T12:00:00`);
    if (d < weekStart) continue;
    const st = normalizeBookingStatus(b.status) || "";
    if (st === "cancelled_by_user" || st === "cancelled_by_manager") continue;
    const sh = String(b.start_time).slice(0, 8);
    const eh = String(b.end_time || b.start_time).slice(0, 8);
    const t0 = new Date(`2000-01-01T${sh}`);
    const t1 = new Date(`2000-01-01T${eh}`);
    const mins = (t1 - t0) / 60000;
    if (Number.isFinite(mins) && mins > 0) bookedMinutesWeek += mins;
  }
  const bookedHoursWeek = Math.round((bookedMinutesWeek / 60) * 10) / 10;

  const attributedCount = bookList.length;
  const cancellationRatePct =
    attributedCount > 0 ? Math.round((cancelled / attributedCount) * 1000) / 10 : null;

  const { data: extRow } = await admin
    .from("teacher_staff_extensions")
    .select("*")
    .eq("business_id", businessId)
    .eq("teacher_user_id", teacherUserId)
    .maybeSingle();

  const { data: bizRow } = await admin.from("businesses").select("*").eq("id", businessId).maybeSingle();
  const { settings: teacherSettingsMerged, row: tsRow } = await fetchTeacherSettingsMerged(admin, businessId, teacherUserId, {
    businessRow: bizRow || null
  });

  const { data: srvRows } = await admin
    .from("teacher_services")
    .select("service_id")
    .eq("business_id", businessId)
    .eq("teacher_id", teacherUserId)
    .eq("is_active", true);

  const assignedServiceIds = (srvRows || []).map((r) => String(r.service_id));

  const { data: svcCatalog } = await admin
    .from("services")
    .select("id, name, duration_minutes, is_active")
    .eq("business_id", businessId)
    .order("name");

  const servicesCatalog = (svcCatalog || []).map((s) => ({
    id: s.id,
    name: s.name,
    duration: Number(s.duration_minutes),
    is_active: s.is_active !== false
  }));

  return {
    membership: {
      role: bu.role,
      status: bu.status,
      categoryId: bu.category_id,
      createdAt: bu.created_at?.slice(0, 10) || ""
    },
    staffExtension: extRow || null,
    rolePreset: extRow?.role_preset || "standard",
    permissions: resolveTeacherPermissions(extRow || null),
    teacherSettings: teacherSettingsMerged,
    hasTeacherSettingsRow: Boolean(tsRow),
    assignedServiceIds,
    servicesCatalog,
    profile: profile || { full_name: "", email: "", phone: "" },
    students,
    bookings: (bookList || []).slice(0, 100).map((b) => ({
      id: b.id,
      date: String(b.booking_date).slice(0, 10),
      time: String(b.start_time).slice(0, 5),
      status: normalizeBookingStatus(b.status) || b.status,
      customerUserId: b.customer_user_id
    })),
    metrics: {
      assignedStudents: students.length,
      attributedBookings: attributedCount,
      completedLessons: completed,
      cancelledLessons: cancelled,
      upcomingBookings: upcoming,
      bookedHoursThisWeek: bookedHoursWeek,
      cancellationRatePct,
      utilizationPct: null
    }
  };
}
