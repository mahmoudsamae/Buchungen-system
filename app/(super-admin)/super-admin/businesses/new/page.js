import { redirect } from "next/navigation";

/** Legacy URL: business creation happens on the Businesses list via modal. */
export default function NewBusinessRedirectPage() {
  redirect("/super-admin/businesses");
}
