import { redirect } from "next/navigation";

/** Creation uses the modal on the schools list (`/super-admin/businesses`). */
export default function SchoolsNewAliasPage() {
  redirect("/super-admin/businesses");
}
