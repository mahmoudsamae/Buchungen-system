import { SchoolLoginClient } from "./school-login-client";

export default async function SchoolLoginPage({ params }) {
  const { slug } = await params;
  return <SchoolLoginClient slug={slug} />;
}
