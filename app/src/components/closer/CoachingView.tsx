import { useEffect, useState } from "react";
import { getMyNotes, type CoachNote } from "../../lib/coachNotes";

interface CoachingViewProps {
  currentUserId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CoachingView({ currentUserId }: CoachingViewProps) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getMyNotes(currentUserId).then((n) => {
      setNotes(n);
      setLoading(false);
    });
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-subtle animate-pulse">Loading coaching notes…</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-10 text-center bg-surface">
        <p className="text-sm text-heading font-medium">No coaching notes yet.</p>
        <p className="text-xs text-subtle mt-1">
          Your manager will leave feedback here after reviewing your calls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm px-4 py-3"
        >
          <p className="text-sm text-body leading-relaxed whitespace-pre-wrap">{note.body}</p>
          <p className="text-2xs text-subtle mt-2">
            From{" "}
            <span className="font-medium text-heading">{note.authorName ?? "Admin"}</span>
            {" · "}
            {timeAgo(note.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
