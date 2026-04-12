import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { normalizeBookingDate } from "@/lib/manager/booking-date-utils";

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function timeToMinutes(t) {
  const s = String(t || "").slice(0, 8);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function fetchTeacherAvailabilityRules(admin, businessId, teacherUserId) {
  try {
    const { data, error } = await admin
      .from("teacher_availability_rules")
      .select("weekday, start_time, end_time, is_active")
      .eq("business_id", businessId)
      .eq("staff_user_id", teacherUserId);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
export async function getTeacherStudentUserIds(admin, businessId, teacherUserId) {
  const { data, error } = await admin
    .from("business_users")
    .select("user_id")
    .eq("business_id", businessId)
    .eq("role", "customer")
    .eq("primary_instructor_user_id", teacherUserId);
  if (error) throw error;
  return (data || []).map((r) => r.user_id);
}

export async function assertTeacherOwnsStudent(admin, businessId, teacherUserId, studentUserId) {
  const { data, error } = await admin
    .from("business_users")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", studentUserId)
    .eq("role", "customer")
    .eq("primary_instructor_user_id", teacherUserId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/**
 * @returns {Promise<object>}
 */
export async function getTeacherOverviewPayload(businessId, teacherUserId, timeZone) {
  const admin = createAdminClient();
  const studentIds = await getTeacherStudentUserIds(admin, businessId, teacherUserId);
  const now = new Date();
  const todayStr = iso(now);
  const weekStart = startOfWeekMonday(now);

  const { data: rules } = await admin
    .from("teacher_availability_rules")
    .select("weekday, start_time, end_time, is_active, valid_from, valid_until")
    .eq("business_id", businessId)
    .eq("staff_user_id", teacherUserId);

  let upcomingExceptions = 0;
  try {
    const { count: exceptionCount } = await admin
      .from("teacher_availability_overrides")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("staff_user_id", teacherUserId)
      .gte("override_date", todayStr);
    upcomingExceptions = exceptionCount || 0;
  } catch {
    upcomingExceptions = 0;
  }

  const availabilityStats = {
    activeRuleCount: (rules || []).filter((r) => r.is_active !== false).length,
    upcomingExceptions
  };

  let availableMinutesWeek = 0;
  for (const r of rules || []) {
    if (r.is_active === false) continue;
    const a = timeToMinutes(r.start_time);
    const b = timeToMinutes(r.end_time);
    if (b > a) availableMinutesWeek += b - a;
  }

  if (!studentIds.length) {
    return {
      kpis: {
        totalStudents: 0,
        todayBookings: 0,
        upcomingBookings: 0,
        completedLessons: 0,
        cancelledLessons: 0,
        bookedHoursWeek: 0,
        utilizationPct: null
      },
      todaySchedule: [],
      upcomingBookings: [],
      weeklyAvailabilitySummary: summarizeRules(rules || []),
      availabilityStats,
      recentStudents: [],
      inactiveStudents: [],
      alerts: [],
      rescheduleRequests: [],
      meta: { timeZone: timeZone || "UTC", today: todayStr }
    };
  }

  const { data: bookings, error: be } = await admin
    .from("bookings")
    .select("id, booking_date, start_time, end_time, status, customer_user_id")
    .eq("business_id", businessId)
    .in("customer_user_id", studentIds);

  if (be) throw be;
  const bookRows = bookings || [];

  const activeLike = new Set(["pending", "confirmed"]);
  let todayBookings = 0;
  let upcomingBookings = 0;
  let completedLessons = 0;
  let cancelledLessons = 0;
  let bookedMinutesWeek = 0;

  for (const b of bookRows) {
    const st = normalizeBookingStatus(b.status) || String(b.status || "");
    const dateStr = normalizeBookingDate(b.booking_date);
    if (dateStr === todayStr) todayBookings += 1;
    if (st === "completed") completedLessons += 1;
    if (st === "cancelled_by_user" || st === "cancelled_by_manager") cancelledLessons += 1;

    const start = new Date(`${dateStr}T${String(b.start_time).slice(0, 8)}`);
    if (activeLike.has(st) && !Number.isNaN(start.getTime()) && start > now) upcomingBookings += 1;

    const bd = new Date(`${dateStr}T12:00:00`);
    if (bd >= weekStart && st !== "cancelled_by_user" && st !== "cancelled_by_manager") {
      const sh = String(b.start_time).slice(0, 8);
      const eh = String(b.end_time || b.start_time).slice(0, 8);
      const t0 = new Date(`2000-01-01T${sh}`);
      const t1 = new Date(`2000-01-01T${eh}`);
      const mins = (t1 - t0) / 60000;
      if (Number.isFinite(mins) && mins > 0) bookedMinutesWeek += mins;
    }
  }

  const bookedHoursWeek = Math.round((bookedMinutesWeek / 60) * 10) / 10;
  const utilizationPct =
    availableMinutesWeek > 0
      ? Math.min(100, Math.round((bookedMinutesWeek / availableMinutesWeek) * 1000) / 10)
      : null;

  const todayList = bookRows
    .filter((b) => normalizeBookingDate(b.booking_date) === todayStr)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

  const { data: nameRows } = await admin.from("profiles").select("id, full_name").in("id", studentIds);
  const names = Object.fromEntries((nameRows || []).map((p) => [p.id, p.full_name || ""]));

  const todaySchedule = todayList.map((b) => ({
    id: b.id,
    time: String(b.start_time).slice(0, 5),
    student: names[b.customer_user_id] || "Student",
    customerUserId: b.customer_user_id,
    status: normalizeBookingStatus(b.status) || b.status
  }));

  const upcomingList = bookRows
    .filter((b) => {
      const st = normalizeBookingStatus(b.status) || "";
      if (!activeLike.has(st)) return false;
      const ds = normalizeBookingDate(b.booking_date);
      const start = new Date(`${ds}T${String(b.start_time).slice(0, 8)}`);
      return !Number.isNaN(start.getTime()) && start > now;
    })
    .sort((a, b) => {
      const da = normalizeBookingDate(a.booking_date);
      const db = normalizeBookingDate(b.booking_date);
      if (da !== db) return da.localeCompare(db);
      return String(a.start_time).localeCompare(String(b.start_time));
    })
    .slice(0, 12)
    .map((b) => ({
      id: b.id,
      date: normalizeBookingDate(b.booking_date),
      time: String(b.start_time).slice(0, 5),
      student: names[b.customer_user_id] || "Student",
      status: normalizeBookingStatus(b.status) || b.status
    }));

  const { data: custRows } = await admin
    .from("business_users")
    .select("user_id, status, created_at")
    .eq("business_id", businessId)
    .in("user_id", studentIds);

  const inactiveStudents = (custRows || [])
    .filter((c) => c.status === "inactive" || c.status === "suspended")
    .map((c) => ({ userId: c.user_id, name: names[c.user_id] || "" }));

  const recentStudents = [...(custRows || [])]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 6)
    .map((c) => ({ userId: c.user_id, name: names[c.user_id] || "", status: c.status }));

  const alerts = [];
  if (inactiveStudents.length) {
    alerts.push({
      id: "inactive",
      severity: "warning",
      title: "Inactive students",
      detail: `${inactiveStudents.length} assigned student(s) are inactive or suspended.`
    });
  }
  if (!availableMinutesWeek) {
    alerts.push({
      id: "no-avail",
      severity: "info",
      title: "No weekly availability",
      detail: "Set your hours under Availability so students can be booked with you."
    });
  }

  return {
    kpis: {
      totalStudents: studentIds.length,
      todayBookings,
      upcomingBookings,
      completedLessons,
      cancelledLessons,
      bookedHoursWeek,
      utilizationPct
    },
    todaySchedule,
    upcomingBookings: upcomingList,
    weeklyAvailabilitySummary: summarizeRules(rules || []),
    recentStudents,
    inactiveStudents,
    alerts,
    rescheduleRequests: [],
    meta: { timeZone: timeZone || "UTC", today: todayStr }
  };
}

function summarizeRules(rules) {
  const byDay = {};
  for (let w = 0; w <= 6; w++) byDay[w] = [];
  for (const r of rules) {
    if (!r.is_active) continue;
    const w = Number(r.weekday);
    if (w < 0 || w > 6) continue;
    const vf = r.valid_from != null ? String(r.valid_from).slice(0, 10) : null;
    const vu = r.valid_until != null ? String(r.valid_until).slice(0, 10) : null;
    byDay[w].push({
      start: String(r.start_time).slice(0, 5),
      end: String(r.end_time).slice(0, 5),
      validFrom: vf,
      validUntil: vu
    });
  }
  return byDay;
}

export async function getTeacherAnalyticsPayload(businessId, teacherUserId) {
  const admin = createAdminClient();
  const studentIds = await getTeacherStudentUserIds(admin, businessId, teacherUserId);
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const monthStart = startOfMonth(now);

  if (!studentIds.length) {
    return {
      lessonsThisWeek: 0,
      lessonsThisMonth: 0,
      activeStudents: 0,
      newStudentsThisMonth: 0,
      busiestDays: [],
      busiestHours: [],
      cancellationRatePct: null,
      completionRatePct: null,
      avgLessonsPerStudent: null,
      inactiveStudents: 0,
      bookedHoursWeek: 0,
      availableHoursWeek: 0,
      utilizationPct: null
    };
  }

  const { data: bookings } = await admin
    .from("bookings")
    .select("booking_date, start_time, end_time, status, customer_user_id, created_at")
    .eq("business_id", businessId)
    .in("customer_user_id", studentIds);

  const rows = bookings || [];
  let lessonsThisWeek = 0;
  let lessonsThisMonth = 0;
  let completed = 0;
  let cancelled = 0;
  const byDay = {};
  const byHour = {};
  let bookedMinutesWeek = 0;

  for (const b of rows) {
    const st = normalizeBookingStatus(b.status) || "";
    const ds = normalizeBookingDate(b.booking_date);
    const bd = new Date(`${ds}T12:00:00`);
    if (bd >= weekStart) {
      lessonsThisWeek += 1;
      if (st !== "cancelled_by_user" && st !== "cancelled_by_manager") {
        const sh = String(b.start_time).slice(0, 8);
        const eh = String(b.end_time || b.start_time).slice(0, 8);
        const t0 = new Date(`2000-01-01T${sh}`);
        const t1 = new Date(`2000-01-01T${eh}`);
        const mins = (t1 - t0) / 60000;
        if (Number.isFinite(mins) && mins > 0) bookedMinutesWeek += mins;
      }
    }
    if (bd >= monthStart) lessonsThisMonth += 1;
    if (st === "completed") completed += 1;
    if (st === "cancelled_by_user" || st === "cancelled_by_manager") cancelled += 1;
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${ds}T12:00:00`).getDay()];
    byDay[wd] = (byDay[wd] || 0) + 1;
    const hh = String(b.start_time).slice(0, 2);
    if (hh) byHour[hh] = (byHour[hh] || 0) + 1;
  }

  const rulesAn = await fetchTeacherAvailabilityRules(admin, businessId, teacherUserId);

  let availableMinutesWeek = 0;
  for (const r of rulesAn || []) {
    if (r.is_active === false) continue;
    const a = timeToMinutes(r.start_time);
    const b = timeToMinutes(r.end_time);
    if (b > a) availableMinutesWeek += b - a;
  }

  const { data: custRows } = await admin
    .from("business_users")
    .select("user_id, status, created_at")
    .eq("business_id", businessId)
    .in("user_id", studentIds);

  const activeStudents = (custRows || []).filter((c) => c.status === "active").length;
  const inactiveStudents = (custRows || []).filter((c) => c.status === "inactive" || c.status === "suspended").length;
  const newStudentsThisMonth = (custRows || []).filter(
    (c) => c.created_at && new Date(c.created_at) >= monthStart
  ).length;

  const total = rows.length;
  const cancellationRatePct = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : null;
  const completionRatePct = total > 0 ? Math.round((completed / total) * 1000) / 10 : null;
  const avgLessonsPerStudent = studentIds.length > 0 ? Math.round((total / studentIds.length) * 10) / 10 : null;

  const busiestDays = Object.entries(byDay)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const busiestHours = Object.entries(byHour)
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const utilizationPct =
    availableMinutesWeek > 0
      ? Math.min(100, Math.round((bookedMinutesWeek / availableMinutesWeek) * 1000) / 10)
      : null;

  return {
    totalBookings: rows.length,
    lessonsThisWeek,
    lessonsThisMonth,
    activeStudents,
    newStudentsThisMonth,
    busiestDays,
    busiestHours,
    cancellationRatePct,
    completionRatePct,
    avgLessonsPerStudent,
    inactiveStudents,
    bookedHoursWeek: Math.round((bookedMinutesWeek / 60) * 10) / 10,
    availableHoursWeek: Math.round((availableMinutesWeek / 60) * 10) / 10,
    utilizationPct
  };
}

/**
 * @returns {Promise<Array<{ userId: string, fullName: string, email: string, phone: string, status: string, completedCount: number, lastLesson: string | null, nextBooking: string | null }>>}
 */
export async function listTeacherStudentsForTable(businessId, teacherUserId) {
  const admin = createAdminClient();
  const studentIds = await getTeacherStudentUserIds(admin, businessId, teacherUserId);
  if (!studentIds.length) return [];

  const { data: mems, error: mErr } = await admin
    .from("business_users")
    .select("user_id, status, created_at")
    .eq("business_id", businessId)
    .in("user_id", studentIds);
  if (mErr) throw mErr;

  const { data: profs } = await admin.from("profiles").select("id, full_name, email, phone").in("id", studentIds);

  const { data: books } = await admin
    .from("bookings")
    .select("customer_user_id, booking_date, start_time, status")
    .eq("business_id", businessId)
    .in("customer_user_id", studentIds);

  const profileById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  const now = new Date();
  const activeLike = new Set(["pending", "confirmed"]);

  const byStudent = {};
  for (const id of studentIds) {
    byStudent[id] = {
      completed: 0,
      lastLesson: null,
      lastCmp: "",
      nextBooking: null,
      nextCmp: ""
    };
  }

  for (const b of books || []) {
    const cid = b.customer_user_id;
    if (!byStudent[cid]) continue;
    const st = normalizeBookingStatus(b.status) || "";
    const ds = normalizeBookingDate(b.booking_date);
    const time = String(b.start_time).slice(0, 5);
    const sortKey = `${ds}T${time}`;
    if (st === "completed") {
      byStudent[cid].completed += 1;
      if (!byStudent[cid].lastCmp || sortKey > byStudent[cid].lastCmp) {
        byStudent[cid].lastCmp = sortKey;
        byStudent[cid].lastLesson = `${ds} ${time}`;
      }
    }
    if (activeLike.has(st)) {
      const start = new Date(`${ds}T${String(b.start_time).slice(0, 8)}`);
      if (!Number.isNaN(start.getTime()) && start > now) {
        if (!byStudent[cid].nextCmp || sortKey < byStudent[cid].nextCmp) {
          byStudent[cid].nextCmp = sortKey;
          byStudent[cid].nextBooking = `${ds} ${time}`;
        }
      }
    }
  }

  return (mems || []).map((m) => {
    const p = profileById[m.user_id] || {};
    const agg = byStudent[m.user_id] || { completed: 0, lastLesson: null, nextBooking: null };
    return {
      userId: m.user_id,
      fullName: p.full_name || "",
      email: p.email || "",
      phone: p.phone || "",
      status: m.status,
      completedCount: agg.completed,
      lastLesson: agg.lastLesson,
      nextBooking: agg.nextBooking
    };
  });
}
