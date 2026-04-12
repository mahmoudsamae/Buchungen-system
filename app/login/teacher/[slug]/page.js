import { TeacherLoginClient } from "./teacher-login-client";

export default async function TeacherLoginPage({ params }) {
  const { slug } = await params;
  return <TeacherLoginClient slug={slug} />;
}
