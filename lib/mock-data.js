export const businesses = [
  {
    id: "biz_1",
    name: "Urban Studio",
    slug: "urban-studio",
    category: "Beauty & Wellness",
    timezone: "America/New_York",
    phone: "+1 (212) 555-0147",
    email: "hello@urbanstudio.com",
    address: "124 Mercer St, New York, NY",
    bookingPolicy: "Free cancellation up to 12 hours before appointment.",
    workingHours: "09:00 - 18:00",
    breakHours: "13:00 - 14:00",
    interval: 30,
    autoConfirm: false
  },
  {
    id: "biz_4",
    name: "Demo",
    slug: "demo",
    category: "Consulting Services",
    timezone: "Europe/Berlin",
    phone: "+49 30 1234 5678",
    email: "hello@demo-business.com",
    address: "Friedrichstrasse 95, Berlin",
    bookingPolicy: "Bookings are auto-confirmed. Free cancellation up to 12 hours before appointment.",
    workingHours: "09:00 - 18:00",
    breakHours: "13:00 - 14:00",
    interval: 30,
    autoConfirm: true
  }
];

export const business = businesses.find((b) => b.slug === "demo");

export const servicesByBusiness = {
  "urban-studio": [
    { id: "srv_1", name: "Signature Haircut", duration: 45, price: 65, active: true },
    { id: "srv_2", name: "Beard Trim & Shape", duration: 25, price: 35, active: true },
    { id: "srv_3", name: "Consultation Session", duration: 30, price: 50, active: true },
    { id: "srv_4", name: "Premium Styling", duration: 60, price: 95, active: false }
  ],
  demo: [
    { id: "demo_srv_1", name: "Quick Consultation", duration: 30, price: 45, active: true },
    { id: "demo_srv_2", name: "Standard Session", duration: 60, price: 85, active: true },
    { id: "demo_srv_3", name: "Extended Session", duration: 90, price: 120, active: true }
  ]
};

export const services = servicesByBusiness.demo;

export const bookings = [
  { id: "DM-1001", customer: "Lena Fischer", service: "Quick Consultation", date: "Apr 03, 2026", time: "09:30", status: "confirmed", amount: 45 },
  { id: "DM-1002", customer: "Jonas Becker", service: "Standard Session", date: "Apr 03, 2026", time: "11:00", status: "confirmed", amount: 85 },
  { id: "DM-1003", customer: "Mia Hoffmann", service: "Extended Session", date: "Apr 03, 2026", time: "14:30", status: "confirmed", amount: 120 },
  { id: "DM-1004", customer: "Noah Klein", service: "Quick Consultation", date: "Apr 03, 2026", time: "16:00", status: "confirmed", amount: 45 }
];

export const customers = [
  { id: "cus_1", name: "Liam Carter", email: "liam@mail.com", phone: "+1 555-1010", visits: 6, lastBooking: "Apr 03, 2026" },
  { id: "cus_2", name: "Sofia Hall", email: "sofia@mail.com", phone: "+1 555-2020", visits: 2, lastBooking: "Apr 01, 2026" },
  { id: "cus_3", name: "Emma Stone", email: "emma@mail.com", phone: "+1 555-3030", visits: 8, lastBooking: "Mar 30, 2026" }
];

export const managerStats = [
  { label: "Today Appointments", value: "4", change: "Apr 03" },
  { label: "Auto-Confirmed", value: "100%", change: "Enabled" },
  { label: "Open Slots", value: "10", change: "Tomorrow" },
  { label: "Expected Revenue", value: "$295", change: "Scheduled" }
];

export const adminBusinesses = [
  { id: "biz_1", name: "Urban Studio", owner: "Maya Lopez", plan: "Growth", status: "active", bookings: 312, lastActive: "2m ago" },
  { id: "biz_2", name: "North Clinic", owner: "Dr. Ryan Cole", plan: "Pro", status: "active", bookings: 528, lastActive: "7m ago" },
  { id: "biz_3", name: "TutorLab", owner: "Sam Turner", plan: "Starter", status: "suspended", bookings: 104, lastActive: "3d ago" },
  { id: "biz_4", name: "Demo", owner: "Platform Demo Owner", plan: "Starter", status: "active", bookings: 4, lastActive: "just now" }
];

export const activityLog = [
  { id: 1, event: "Business suspended", actor: "Admin Sarah", target: "TutorLab", at: "Apr 2, 10:21" },
  { id: 2, event: "New business created", actor: "Admin Sarah", target: "Clear Mind Coaching", at: "Apr 2, 09:12" },
  { id: 3, event: "Plan changed to Pro", actor: "Admin Omar", target: "North Clinic", at: "Apr 1, 18:04" }
];

export const slotGroupsByBusiness = {
  "urban-studio": [
    { label: "Morning", slots: ["09:00", "09:30", "10:00", "10:30", "11:00"] },
    { label: "Afternoon", slots: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30"] },
    { label: "Evening", slots: ["16:00", "16:30", "17:00"] }
  ],
  demo: [
    { label: "Morning", slots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"] },
    { label: "Afternoon", slots: ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"] }
  ]
};

export const slotGroups = slotGroupsByBusiness.demo;
export const bookedSlotsByBusiness = {
  "urban-studio": ["09:30", "11:00"],
  demo: ["09:30", "11:00", "14:30", "16:00"]
};

export function getBusinessBySlug(slug) {
  return businesses.find((item) => item.slug === slug) || businesses[0];
}

export function getServicesBySlug(slug) {
  return servicesByBusiness[slug] || servicesByBusiness["urban-studio"];
}

export function getSlotGroupsBySlug(slug) {
  return slotGroupsByBusiness[slug] || slotGroupsByBusiness["urban-studio"];
}

export function getBookedSlotsBySlug(slug) {
  return bookedSlotsByBusiness[slug] || [];
}
