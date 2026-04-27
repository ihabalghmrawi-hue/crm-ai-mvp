import Link from "next/link";
import type { Database } from "@/lib/supabase/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

const tagColors: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-blue-100 text-blue-600",
};

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link href={`/crm/customers/${customer.id}`}>
      <div className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
            <p className="text-sm text-slate-500">{customer.location}</p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${tagColors[customer.lead_tag] ?? "bg-slate-100 text-slate-500"}`}>
            {customer.lead_tag}
          </span>
        </div>
        <div className="mt-3 flex gap-4 text-sm text-slate-600">
          <span>Budget: <strong>${customer.budget.toLocaleString()}</strong></span>
          <span>{customer.interest_type}</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{customer.email}</p>
      </div>
    </Link>
  );
}
