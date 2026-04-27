"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function AddCustomerForm({ onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    budget: "",
    interest_type: "",
    lead_tag: "cold" as "hot" | "warm" | "cold",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error: insertError } = await supabase.from("customers").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim() || null,
      budget: parseFloat(form.budget) || 0,
      interest_type: form.interest_type.trim(),
      lead_tag: form.lead_tag,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      onSaved();
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add Customer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "Full Name", field: "name", type: "text", required: true },
            { label: "Email", field: "email", type: "email", required: true },
            { label: "Phone", field: "phone", type: "tel", required: true },
            { label: "Location", field: "location", type: "text" },
            { label: "Budget (USD)", field: "budget", type: "number" },
            { label: "Interest Type", field: "interest_type", type: "text", placeholder: "e.g. Real Estate" },
          ].map(({ label, field, type, required, placeholder }) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              <input
                type={type}
                required={required}
                value={form[field as keyof typeof form]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lead Status</label>
            <select
              value={form.lead_tag}
              onChange={(e) => set("lead_tag", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
