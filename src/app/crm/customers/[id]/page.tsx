"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateInsight } from "@/lib/ai/insights";
import { scheduleFollowUp } from "@/lib/followups/scheduler";
import type { Customer, Interaction, DealContext } from "@/lib/types";

type DBCustomer = {
  id: string; name: string; phone: string; email: string;
  location: string | null; budget: number; interest_type: string;
  lead_tag: "hot" | "warm" | "cold"; sales_rep_id: string | null;
  created_at: string; updated_at: string;
};
type DBInteraction = {
  id: string; customer_id: string; kind: "call" | "whatsapp" | "meeting";
  note: string | null; responded_in_minutes: number | null; created_at: string;
};
type DBDeal = {
  id: string; customer_id: string;
  stage: "lead" | "contacted" | "negotiation" | "closed";
  engagement_level: number; value: number; created_at: string; updated_at: string;
};

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<DBCustomer | null>(null);
  const [interactions, setInteractions] = useState<DBInteraction[]>([]);
  const [deal, setDeal] = useState<DBDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [newKind, setNewKind] = useState<"call" | "whatsapp" | "meeting">("call");
  const [savingNote, setSavingNote] = useState(false);

  async function loadData() {
    const [
      { data: customerData },
      { data: interactionsData },
      { data: dealsData },
    ] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("interactions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("deals").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(1),
    ]);

    if (!customerData) { router.push("/crm"); return; }
    setCustomer(customerData);
    setInteractions(interactionsData ?? []);
    setDeal(dealsData?.[0] ?? null);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  // Map DB row → domain type for AI functions
  function toCustomer(c: DBCustomer): Customer {
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      location: c.location ?? "",
      budget: c.budget,
      interestType: c.interest_type,
      tags: [c.lead_tag],
      salesRepId: c.sales_rep_id ?? undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  function toInteraction(i: DBInteraction): Interaction {
    return {
      id: i.id,
      customerId: i.customer_id,
      kind: i.kind,
      note: i.note ?? "",
      respondedInMinutes: i.responded_in_minutes ?? undefined,
      createdAt: i.created_at,
    };
  }

  function toDealContext(d: DBDeal | null): DealContext {
    return {
      stage: d?.stage ?? "lead",
      engagementLevel: d?.engagement_level ?? 50,
    };
  }

  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !newNote.trim()) return;
    setSavingNote(true);

    const { data: newInteraction } = await supabase
      .from("interactions")
      .insert({ customer_id: customer.id, kind: newKind, note: newNote.trim() })
      .select()
      .single();

    if (newInteraction) {
      const updatedInteractions = [newInteraction, ...interactions];
      setInteractions(updatedInteractions);

      // Recompute lead score and update customer tag
      const domainInteractions = updatedInteractions.map(toInteraction);
      const insight = generateInsight({
        customer: toCustomer(customer),
        interactions: domainInteractions,
        deal: toDealContext(deal),
      });

      await supabase
        .from("customers")
        .update({ lead_tag: insight.intentClass === "High intent" ? "hot" : insight.intentClass === "Medium intent" ? "warm" : "cold" })
        .eq("id", customer.id);

      // Upsert latest AI insight
      await supabase.from("ai_insights").insert({
        customer_id: customer.id,
        likelihood_score: insight.likelihoodScore,
        intent_class: insight.intentClass,
        best_contact_time: insight.bestContactTime,
        recommended_offer: insight.recommendedOffer,
        model_version: insight.modelVersion,
      });

      // Auto-schedule follow-up
      const followUp = scheduleFollowUp({
        customerId: customer.id,
        leadStatus: insight.intentClass === "High intent" ? "hot" : insight.intentClass === "Medium intent" ? "warm" : "cold",
        lastInteractionAt: newInteraction.created_at,
      });
      await supabase.from("follow_ups").insert({
        customer_id: followUp.customerId,
        due_at: followUp.dueAt,
        reminder_text: followUp.reminderText,
        status: followUp.status,
      });

      setNewNote("");
    }

    setSavingNote(false);
  }

  async function handleUpdateTag(tag: "hot" | "warm" | "cold") {
    if (!customer) return;
    await supabase.from("customers").update({ lead_tag: tag }).eq("id", customer.id);
    setCustomer({ ...customer, lead_tag: tag });
  }

  if (loading || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading customer…</p>
      </main>
    );
  }

  const domainCustomer = toCustomer(customer);
  const domainInteractions = interactions.map(toInteraction);
  const insight = generateInsight({ customer: domainCustomer, interactions: domainInteractions, deal: toDealContext(deal) });

  const tagColors: Record<string, string> = {
    hot: "bg-red-100 text-red-700",
    warm: "bg-amber-100 text-amber-700",
    cold: "bg-blue-100 text-blue-700",
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white px-6 py-3">
        <Link href="/crm" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <p className="text-sm text-slate-500">{customer.email} · {customer.phone}</p>
            <p className="text-sm text-slate-500">{customer.location}</p>
          </div>
          <div className="flex gap-2">
            {(["hot", "warm", "cold"] as const).map((tag) => (
              <button
                key={tag}
                onClick={() => handleUpdateTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  customer.lead_tag === tag ? tagColors[tag] : "bg-slate-100 text-slate-500"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* AI Insight Cards */}
        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Likelihood Score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{insight.likelihoodScore}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${insight.likelihoodScore}%` }}
              />
            </div>
          </article>
          <article className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Intent</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{insight.intentClass}</p>
          </article>
          <article className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Best Contact Time</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{insight.bestContactTime}</p>
          </article>
        </section>

        {/* Recommended Offer */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Recommended Offer</h2>
          <p className="mt-2 text-slate-600">{insight.recommendedOffer}</p>
        </section>

        {/* Customer Details */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Details</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-slate-500">Budget</dt>
              <dd className="font-medium text-slate-900">${customer.budget.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Interest</dt>
              <dd className="font-medium text-slate-900">{customer.interest_type}</dd>
            </div>
            {deal && (
              <>
                <div>
                  <dt className="text-slate-500">Deal Stage</dt>
                  <dd className="font-medium capitalize text-slate-900">{deal.stage}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Deal Value</dt>
                  <dd className="font-medium text-slate-900">${Number(deal.value).toLocaleString()}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {/* Add Interaction */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Log Interaction</h2>
          <form onSubmit={handleAddInteraction} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as "call" | "whatsapp" | "meeting")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="meeting">Meeting</option>
            </select>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Notes…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={savingNote}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingNote ? "Saving…" : "Log"}
            </button>
          </form>
        </section>

        {/* Activity Timeline */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Activity Timeline</h2>
          {interactions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No interactions yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {interactions.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium capitalize ${
                    item.kind === "call" ? "bg-green-100 text-green-700"
                    : item.kind === "whatsapp" ? "bg-emerald-100 text-emerald-700"
                    : "bg-purple-100 text-purple-700"
                  }`}>
                    {item.kind}
                  </span>
                  <span className="flex-1 text-slate-700">{item.note}</span>
                  <span className="whitespace-nowrap text-slate-400">
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
