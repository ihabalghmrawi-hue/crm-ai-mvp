import { redirect } from "next/navigation";

// Root → redirect to CRM dashboard (middleware handles auth)
export default function RootPage() {
  redirect("/crm");
}
