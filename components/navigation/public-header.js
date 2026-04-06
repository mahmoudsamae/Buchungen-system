import Link from "next/link";

export function PublicHeader({ businessName }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold">
          {businessName}
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/customer/bookings">My Bookings</Link>
          <Link href="/customer/profile">Profile</Link>
        </div>
      </div>
    </header>
  );
}
