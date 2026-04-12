import { redirect } from "next/navigation";

/** Product alias: schools are stored as `businesses` rows; list UI lives at `/super-admin/businesses`. */
export default function SchoolsAliasPage() {
  redirect("/super-admin/businesses");
}
