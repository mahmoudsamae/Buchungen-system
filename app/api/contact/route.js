import { NextResponse } from "next/server";
import { Resend } from "resend";

const DEFAULT_TO = "mahmoudsamaedbm@gmail.com";

function sanitize(str, maxLen) {
  if (str == null || typeof str !== "string") return "";
  return str
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLen);
}

function isValidEmail(email) {
  if (!email || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = sanitize(body.name, 200);
  const email = sanitize(body.email, 320).toLowerCase();
  const company = sanitize(body.company, 300);
  const phone = sanitize(body.phone, 80);
  const teamSize = sanitize(body.teamSize, 80);
  const requestType = sanitize(body.requestType, 500);
  const message = sanitize(body.message, 10000);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const to = (process.env.CONTACT_TO_EMAIL || DEFAULT_TO).trim();
  const from = (process.env.RESEND_FROM_EMAIL || "BookFlow <onboarding@resend.dev>").trim();

  const timestamp = new Date().toISOString();

  const textBody = [
    "New demo / contact request — BookFlow",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company/School: ${company || "—"}`,
    `Phone: ${phone || "—"}`,
    `Team size: ${teamSize || "—"}`,
    `Request / topic: ${requestType || "—"}`,
    "",
    "Message:",
    message,
    "",
    `Timestamp (UTC): ${timestamp}`
  ].join("\n");

  const resend = new Resend(apiKey);

  const { error: ownerError } = await resend.emails.send({
    from,
    to: [to],
    replyTo: email,
    subject: "New Demo Request – BookFlow",
    text: textBody
  });

  if (ownerError) {
    console.error("[api/contact] owner email", ownerError);
    return NextResponse.json({ error: "Could not send your message. Please try again later." }, { status: 502 });
  }

  const { error: confirmError } = await resend.emails.send({
    from,
    to: [email],
    subject: "We received your request",
    text: [
      `Hi ${name},`,
      "",
      "Thank you for reaching out.",
      "I will review your request personally and get back to you shortly.",
      "",
      "— BookFlow"
    ].join("\n")
  });

  if (confirmError) {
    console.error("[api/contact] confirmation email", confirmError);
  }

  return NextResponse.json({ ok: true });
}
