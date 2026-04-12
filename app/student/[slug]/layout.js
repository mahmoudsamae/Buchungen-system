import { PortalShell } from "@/components/portal/portal-shell";

export default async function StudentPortalLayout({ children, params }) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug} baseSegment="student">
      {children}
    </PortalShell>
  );
}
