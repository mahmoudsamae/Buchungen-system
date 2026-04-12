import Link from "next/link";

/**
 * Root /portal — student flows live under /portal/[slug]. This page avoids a bare 404
 * when using the landing “Test Access → Student” shortcut.
 */
export default function PortalRootPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Student portal</h1>
      <p className="text-sm text-muted-foreground">
        Your school&apos;s portal URL includes its slug (for example{" "}
        <span className="font-mono text-foreground">/portal/your-school/login</span>
        ).
      </p>
      <p className="text-sm text-muted-foreground">
        <Link href="/choose-role" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
          Open role chooser / demo
        </Link>
      </p>
    </div>
  );
}
