type FollowUp = {
  id: string; customer_id: string; due_at: string; reminder_text: string;
  status: "pending" | "done" | "snoozed" | "cancelled";
  snoozed_until: string | null; created_at: string; updated_at: string;
  customers?: { name: string } | null;
};

interface Props {
  followUps: FollowUp[];
  onMarkDone: (id: string) => void;
  onSnooze: (id: string) => void;
}

export function FollowUpsList({ followUps, onMarkDone, onSnooze }: Props) {
  const isOverdue = (dueAt: string) => new Date(dueAt) < new Date();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Daily Follow-ups</h2>

      {followUps.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No pending follow-ups. Great job!</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {followUps.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-slate-700">{item.reminder_text}</p>
                <p className={`text-xs ${isOverdue(item.due_at) ? "text-red-500 font-medium" : "text-slate-400"}`}>
                  {isOverdue(item.due_at) ? "Overdue · " : ""}
                  {new Date(item.due_at).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onMarkDone(item.id)}
                  className="rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                >
                  Done
                </button>
                <button
                  onClick={() => onSnooze(item.id)}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  +24h
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
