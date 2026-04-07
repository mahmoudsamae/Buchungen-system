"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { localDateString, normalizeBookingDate } from "@/lib/manager/booking-date-utils";
import { businessRowToSettings } from "@/lib/manager/business-settings";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { useLanguage } from "@/components/i18n/language-provider";

const ManagerContext = createContext(null);

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ManagerDataProvider({ children, initialBusiness, userId }) {
  const { t } = useLanguage();
  const [business, setBusiness] = useState(initialBusiness);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState(() => businessRowToSettings(initialBusiness));
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const notify = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2400);
  }, []);

  const businessSlug = business?.slug ?? "";

  const loadAll = useCallback(async () => {
    setLoading(true);
    const slug = businessSlug;
    const api = (path, init) => managerFetch(slug, path, init);
    const results = await Promise.allSettled([
      api("/api/manager/business"),
      api("/api/manager/bookings"),
      api("/api/manager/customers"),
      api("/api/manager/services"),
      api("/api/manager/availability")
    ]);

    const [bRes, bookRes, custRes, serviceRes, ruleRes] = results;
    try {
      if (bRes.status === "fulfilled") {
        if (bRes.value.ok) {
          const b = await bRes.value.json();
          if (b.business) setBusiness(b.business);
          if (b.settings) setSettings(b.settings);
          else if (b.business) setSettings(businessRowToSettings(b.business));
        }
      } else {
        notify("Could not load business details.");
      }

      if (bookRes.status === "fulfilled") {
        if (bookRes.value.ok) {
          const j = await bookRes.value.json();
          setBookings(
            (j.bookings || []).map((b) => ({
              ...b,
              date: normalizeBookingDate(b.date)
            }))
          );
        } else {
          const errBody = await bookRes.value.json().catch(() => ({}));
          notify(errBody.error || "Could not load bookings.");
        }
      } else {
        notify("Could not load bookings.");
      }

      if (custRes.status === "fulfilled") {
        if (custRes.value.ok) {
          const j = await custRes.value.json();
          setCustomers(j.customers || []);
        } else {
          const errBody = await custRes.value.json().catch(() => ({}));
          notify(errBody.error || "Could not load customers.");
        }
      } else {
        notify("Could not load customers.");
      }

      if (serviceRes.status === "fulfilled") {
        if (serviceRes.value.ok) {
          const j = await serviceRes.value.json();
          setServices(j.services || []);
          if (j.degraded) {
            console.warn("[manager] services list degraded (empty). Check DB migration / schema cache for public.services.");
          }
        } else {
          const errBody = await serviceRes.value.json().catch(() => ({}));
          console.error("[manager] services request failed:", errBody.error || serviceRes.value.status);
          setServices([]);
        }
      } else {
        console.error("[manager] services fetch rejected:", serviceRes.reason);
        setServices([]);
      }

      if (ruleRes.status === "fulfilled") {
        if (ruleRes.value.ok) {
          const j = await ruleRes.value.json();
          setRules(
            (j.rules || []).map((r) => ({
              ...r,
              weekday: Number(r.weekday)
            }))
          );
          if (j.degraded) {
            console.warn("[manager] availability rules degraded (empty).");
          }
        } else {
          const errBody = await ruleRes.value.json().catch(() => ({}));
          console.error("[manager] availability request failed:", errBody.error || ruleRes.value.status);
          setRules([]);
        }
      } else {
        console.error("[manager] availability fetch rejected:", ruleRes.reason);
        setRules([]);
      }
    } catch (e) {
      console.error(e);
      notify("Failed to process data.");
    } finally {
      setLoading(false);
    }
  }, [notify, businessSlug]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const availability = useMemo(() => {
    return WEEKDAYS.map((label) => {
      const wd = WEEKDAYS.indexOf(label);
      const slots = rules
        .filter((r) => Number(r.weekday) === wd)
        .map((r) => ({
          id: r.id,
          time: `${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`,
          enabled: r.is_active,
          raw: r
        }));
      return { day: label, slots };
    });
  }, [rules]);

  const stats = useMemo(() => {
    const today = localDateString(new Date());
    const todayBookings = bookings.filter((b) => normalizeBookingDate(b.date) === today);
    const openSlots = rules.filter((r) => r.is_active).length;
    return [
      { label: t("manager.stats.todayAppointments"), value: String(todayBookings.length), change: today },
      {
        label: t("manager.stats.autoConfirm"),
        value: settings.autoConfirm ? t("manager.stats.enabled") : t("manager.stats.disabled"),
        change: t("manager.stats.bookingMode")
      },
      {
        label: t("manager.stats.activeWindows"),
        value: String(openSlots),
        change: t("manager.stats.availabilityRules")
      },
      {
        label: t("manager.stats.slotLength"),
        value: `${business?.slot_duration_minutes || 30} min`,
        change: t("manager.stats.perBusiness")
      }
    ];
  }, [bookings, rules, settings.autoConfirm, business?.slot_duration_minutes, t]);

  const bookingActions = {
    updateStatus: async (id, status) => {
      const res = await managerFetch(businessSlug, `/api/manager/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Update failed.");
        return;
      }
      await loadAll();
      notify(`Booking updated to ${status}.`);
    },
    reschedule: async (id, { date, time }) => {
      const res = await managerFetch(businessSlug, `/api/manager/bookings/${id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, start_time: time })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Reschedule failed.");
        return false;
      }
      await loadAll();
      notify("Booking rescheduled.");
      return true;
    },
    completeLesson: async (id, payload) => {
      const res = await managerFetch(businessSlug, `/api/manager/bookings/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Could not complete lesson.");
        return false;
      }
      await loadAll();
      notify("Lesson completed and report saved.");
      return true;
    },
    delete: async (id) => {
      const res = await managerFetch(businessSlug, `/api/manager/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        notify("Delete failed.");
        return;
      }
      await loadAll();
      notify("Booking removed.");
    },
    save: async (payload) => {
      if (payload.id) {
        const res = await managerFetch(businessSlug, `/api/manager/bookings/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: payload.date,
            start_time: payload.time,
            status: payload.status,
            notes: payload.notes,
            customerUserId: payload.customerUserId ?? payload.customer_user_id,
            serviceId: payload.serviceId ?? payload.service_id,
            internalNote: payload.internalNote ?? payload.internal_note
          })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          notify(e.error || "Save failed.");
          return false;
        }
      } else {
        const createBody = {
          customerUserId: payload.customerUserId,
          serviceId: payload.serviceId ?? payload.service_id,
          booking_date: payload.date,
          start_time: payload.time,
          notes: payload.notes,
          internalNote: payload.internalNote ?? payload.internal_note
        };
        if (payload.status) createBody.status = payload.status;
        const res = await managerFetch(businessSlug, "/api/manager/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createBody)
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          notify(e.error || "Create failed.");
          return false;
        }
      }
      await loadAll();
      notify("Booking saved.");
      return true;
    }
  };

  const customerActions = {
    save: async (payload) => {
      if (payload.id) {
        const patch = {
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone,
        status: payload.status,
        internalNote: payload.internalNote
        };
        const np = payload.newPassword != null ? String(payload.newPassword) : "";
        if (np.length >= 8) patch.newPassword = np;
        const res = await managerFetch(businessSlug, `/api/manager/customers/${payload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          notify(e.error || "Update failed.");
          return;
        }
      } else {
        const res = await managerFetch(businessSlug, "/api/manager/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: payload.fullName,
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
            status: payload.status || "active"
          })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          notify(e.error || "Could not add customer.");
          return;
        }
      }
      await loadAll();
      notify(payload.id ? "Customer updated." : "Customer added.");
    },
    setStatus: async (id, status) => {
      const res = await managerFetch(businessSlug, `/api/manager/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Status update failed.");
        return;
      }
      await loadAll();
      notify(`Customer marked ${status}.`);
    },
    loadTimeline: async (id) => {
      const res = await managerFetch(businessSlug, `/api/manager/customers/${id}/timeline`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Could not load customer profile.");
        return null;
      }
      return res.json();
    },
    saveInternalNote: async (id, internalNote) => {
      const res = await managerFetch(businessSlug, `/api/manager/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Could not save customer note.");
        return false;
      }
      await loadAll();
      notify("Customer note saved.");
      return true;
    },
    delete: async (id) => {
      const res = await managerFetch(businessSlug, `/api/manager/customers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Delete failed.");
        return;
      }
      await loadAll();
      notify("Customer removed from this business.");
    },
    /** If `password` is set (≥8 chars), admin-sets password; otherwise sends recovery email when SMTP is configured. */
    resetPassword: async (id, password) => {
      const body = password && String(password).length >= 8 ? { password: String(password) } : {};
      const res = await managerFetch(businessSlug, `/api/manager/customers/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Password reset failed.");
        return;
      }
      const j = await res.json().catch(() => ({}));
      await loadAll();
      if (j.method === "direct") notify("New password saved. Customer can sign in with it.");
      else notify(j.message || "Recovery email queued (configure SMTP in Supabase).");
    }
  };

  const serviceActions = {
    save: async (payload) => {
      const isEdit = Boolean(payload?.id);
      const url = isEdit ? `/api/manager/services/${payload.id}` : "/api/manager/services";
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        name: payload.name,
        duration: Number(payload.duration),
        price: payload.price === "" || payload.price == null ? null : Number(payload.price),
        description: payload.description || "",
        status: payload.status || "active"
      };
      const res = await managerFetch(businessSlug, url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Service save failed.");
        return;
      }
      await loadAll();
      notify(isEdit ? "Service updated." : "Service created.");
    },
    toggleStatus: async (id) => {
      const current = services.find((s) => s.id === id);
      if (!current) return;
      const nextStatus = current.status === "active" ? "inactive" : "active";
      const res = await managerFetch(businessSlug, `/api/manager/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Service status update failed.");
        return;
      }
      await loadAll();
      notify(`Service ${nextStatus}.`);
    },
    delete: async (id) => {
      const res = await managerFetch(businessSlug, `/api/manager/services/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Service delete failed.");
        return;
      }
      await loadAll();
      notify("Service deleted.");
    }
  };

  const availabilityActions = {
    addSlot: () => notify("Use rule form: add a start/end window per weekday on Availability page."),
    toggleSlot: async (dayLabel, slotId) => {
      const slot = availability.find((d) => d.day === dayLabel)?.slots.find((s) => s.id === slotId);
      if (!slot?.raw) return;
      const res = await managerFetch(businessSlug, `/api/manager/availability/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !slot.raw.is_active })
      });
      if (!res.ok) {
        notify("Update failed.");
        return;
      }
      await loadAll();
      notify("Rule updated.");
    },
    updateSlot: async (dayLabel, slotId, timeRange) => {
      const parts = timeRange.split(/[–-]/);
      if (parts.length < 2) {
        notify("Use format start–end (e.g. 09:00–12:00).");
        return;
      }
      const start = parts[0].trim();
      const end = parts[1].trim();
      const res = await managerFetch(businessSlug, `/api/manager/availability/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: start, end_time: end })
      });
      if (!res.ok) {
        notify("Update failed..");
        return;
      }
      await loadAll();
      notify("Window updated.");
    },
    removeSlot: async (dayLabel, slotId) => {
      const res = await managerFetch(businessSlug, `/api/manager/availability/${slotId}`, { method: "DELETE" });
      if (!res.ok) {
        notify("Delete failed.");
        return;
      }
      await loadAll();
      notify("Rule removed.");
    },
    addRule: async (weekday, start_time, end_time) => {
      const res = await managerFetch(businessSlug, "/api/manager/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekday, start_time, end_time, is_active: true })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.error || "Could not add rule.");
        return;
      }
      await loadAll();
      notify("Availability rule added.");
    },
    /** Contiguous windows from start–end; updates business slot length to match. */
    generateSlots: async ({ weekday, start_time, end_time, slot_duration_minutes }) => {
      try {
        const res = await managerFetch(businessSlug, "/api/manager/availability/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekday, start_time, end_time, slot_duration_minutes })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(j.error || `Could not generate slots (${res.status}).`);
          return { ok: false };
        }
        const count = typeof j.count === "number" ? j.count : 0;
        if (!j.ok || count < 1) {
          notify(j.error || "No availability rows were saved.");
          await loadAll();
          return { ok: false };
        }
        await loadAll();
        if (j.partial) {
          notify(
            `Saved ${count} window(s). ${j.error || "Default slot length could not be updated — check Settings."}`
          );
        } else {
          notify(
            `Added ${count} slot window(s). Default slot length set to ${j.slot_duration_minutes ?? slot_duration_minutes} min.`
          );
        }
        return { ok: true };
      } catch (e) {
        console.error(e);
        notify(e?.message || "Network error while generating slots.");
        return { ok: false };
      }
    }
  };

  const settingsActions = {
    save: async (payload) => {
      const res = await managerFetch(businessSlug, "/api/manager/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        notify(e.errors?.[0] || e.error || "Settings save failed.");
        return false;
      }
      const j = await res.json();
      setSettings(j.settings);
      setBusiness(j.business);
      notify("Settings saved.");
      return true;
    }
  };

  const value = {
    business,
    userId,
    bookings,
    customers,
    services,
    availability,
    availabilityRules: rules,
    settings,
    stats,
    loading,
    bookingActions,
    customerActions,
    serviceActions,
    availabilityActions,
    settingsActions,
    reload: loadAll
  };

  return (
    <ManagerContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-card px-4 py-3 text-sm shadow-card">
          {toast}
        </div>
      ) : null}
    </ManagerContext.Provider>
  );
}

export function useManager() {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error("useManager must be used inside ManagerDataProvider");
  return ctx;
}

/** @deprecated use ManagerDataProvider */
export const ManagerProvider = ManagerDataProvider;
