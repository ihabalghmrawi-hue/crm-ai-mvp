"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardKPIs } from "@/components/dashboard-kpis";
import { FollowUpsList } from "@/components/followups-list";
import { CustomerCard } from "@/components/customer-card";
import { AddCustomerForm } from "@/components/add-customer-form";

export type Customer = {
  id: string; name: string; phone: string; email: string;
  location: string | null; budget: number; interest_type: string;
  lead_tag: "hot" | "warm" | "cold"; sales_rep_id: string | null;
  created_at: string; updated_at: string;
};
export type FollowUp = {
  id: string; customer_id: string; due_at: string; reminder_text: string;
  status: "pending" | "done" | "snoozed" | "cancelled";
  snoozed_until: string | null; created_at: string; updated_at: string;
  customers?: { name: string } | null;
};
interface KPIData {
  total_customers: number; hot_leads: number; warm_leads: number;
  cold_leads: number; hot_rate_pct: number;
}
interface PipelineStage {
  stage: string; deal_count: number; total_value: number; avg_engagement: number;
}

export default function CRMHomePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      setLoading(true);

      // Check auth first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth/login"; return; }
      setUserEmail(user.email ?? "");

      // Fetch customers and follow-ups
      const [{ data: customersData }, { data: followUpsData }] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("follow_ups").select("*, customers(name)").eq("status", "pending").order("due_at", { ascending: true }).limit(10),
      ]);
      setCustomers((customersData as Customer[]) ?? []);
      setFollowUps((followUpsData as FollowUp[]) ?? []);

      // Fetch views (may not exist yet — ignore errors)
      const { data: kpisData } = await supabase.from("dashboard_kpis").select("*").single();
      setKpis(kpisData as KPIData ?? null);

      const { data: pipelineData } = await supabase.from("pipeline_summary").select("*");
      setPipeline((pipelineData as PipelineStage[]) ?? []);

    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  async function handleMarkDone(followUpId: string) {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.from("follow_ups").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", followUpId);
    setFollowUps((prev) => prev.filter((f) => f.id !== followUpId));
  }

  async function handleSnooze(followUpId: string) {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("follow_ups").update({ status: "snoozed", snoozed_until: snoozedUntil, updated_at: new Date().toISOString() }).eq("id", followUpId);
    setFollowUps((prev) => prev.filter((f) => f.id !== followUpId));
  }

  function handleExportCSV() {
    if (!customers.length) return;
    const headers = ["Name", "Email", "Phone", "Location", "Budget", "Interest", "Lead Tag"];
    const rows = customers.map((c) => [c.name, c.email, c.phone, c.location ?? "", c.budget, c.interest_type, c.lead_tag]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "customers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading dashboard…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">AI CRM</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{userEmail}</span>
          <button onClick={handleSignOut} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
            Sign out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              Export CSV
            </button>
            <button onClick={() => setShowAddForm(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + Add Customer
            </button>
          </div>
        </div>

        <DashboardKPIs kpis={kpis} />

        {pipeline.length > 0 && (
          <section>
            <h3 className="mb-3 text-lg font-semibold text-slate-800">Pipeline</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              {pipeline.map((stage) => (
                <article key={stage.stage} className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-sm capitalize text-slate-500">{stage.stage}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{stage.deal_count}</p>
                  <p className="text-xs text-slate-400">${Number(stage.total_value).toLocaleString()} · {stage.avg_engagement}% engagement</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <FollowUpsList followUps={followUps} onMarkDone={handleMarkDone} onSnooze={handleSnooze} />

        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-800">Customers ({customers.length})</h3>
          {customers.length === 0 ? (
            <p className="text-sm text-slate-400">No customers yet. Add your first one!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showAddForm && (
        <AddCustomerForm onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); loadData(); }} />
      )}
    </main>
  );
}
