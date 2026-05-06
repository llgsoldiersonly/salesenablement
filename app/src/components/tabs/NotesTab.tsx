import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Button, CTAButton } from "../ui/Button";
import {
  addAssessmentNote,
  deleteAssessmentNote,
  getNotesForAssessment,
  updateAssessmentNote,
  type AssessmentNote,
} from "../../lib/assessmentNotes";
import { supabase } from "../../lib/supabase";

const ACTIVE_KEY = "llg.activeAssessment.v2";

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

export function NotesTab() {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<AssessmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem(ACTIVE_KEY);
    setAssessmentId(id);
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getNotesForAssessment(assessmentId).then((n) => {
      if (cancelled) return;
      setNotes(n);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const handleAdd = async () => {
    if (!assessmentId || !draft.trim() || saving) return;
    setSaving(true);
    const note = await addAssessmentNote(assessmentId, draft.trim());
    if (note) {
      setNotes((prev) => [note, ...prev]);
      setDraft("");
    }
    setSaving(false);
  };

  if (!assessmentId) {
    return (
      <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
        <h2 className="text-2xl font-semibold text-heading">Strategy Notes</h2>
        <Card className="text-center">
          <p className="text-sm text-subtle">No active assessment loaded.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
      <div>
        <h2 className="text-2xl font-semibold text-heading">Strategy Notes</h2>
        <p className="text-sm text-subtle mt-0.5">
          Shared with the whole team. Use this for handoff context, follow-up actions, and observations.
        </p>
      </div>

      {/* Composer */}
      <Card>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note for whoever picks up this lead next…"
          className="w-full h-24 bg-transparent text-sm text-body resize-none outline-none placeholder:text-subtle leading-relaxed"
          maxLength={5000}
          disabled={saving}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-2xs text-subtle">{draft.length}/5000</p>
          <CTAButton size="sm" onClick={() => void handleAdd()} disabled={!draft.trim() || saving}>
            {saving ? "Saving…" : "Post note"}
          </CTAButton>
        </div>
      </Card>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-subtle animate-pulse text-center py-8">Loading notes…</p>
      ) : notes.length === 0 ? (
        <div className="border border-dashed border-[var(--color-border-strong)] rounded-[8px] p-8 text-center bg-surface">
          <p className="text-sm text-heading font-medium">No notes yet.</p>
          <p className="text-xs text-subtle mt-1">
            Be the first to leave context for the next rep on this lead.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              isOwn={n.authorId === currentUserId}
              onUpdate={(body) => {
                setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, body } : x)));
              }}
              onDelete={() => {
                setNotes((prev) => prev.filter((x) => x.id !== n.id));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  isOwn,
  onUpdate,
  onDelete,
}: {
  note: AssessmentNote;
  isOwn: boolean;
  onUpdate: (body: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    await updateAssessmentNote(note.id, draft.trim());
    onUpdate(draft.trim());
    setBusy(false);
    setEditing(false);
  };

  const remove = async () => {
    if (busy) return;
    if (!confirm("Delete this note?")) return;
    setBusy(true);
    await deleteAssessmentNote(note.id);
    onDelete();
  };

  return (
    <div className="bg-surface rounded-[8px] border border-[var(--color-border)] shadow-sm px-4 py-3">
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-24 bg-transparent text-sm text-body resize-none outline-none leading-relaxed"
            maxLength={5000}
            disabled={busy}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="neutral"
              size="sm"
              onClick={() => {
                setDraft(note.body);
                setEditing(false);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <CTAButton size="sm" onClick={() => void save()} disabled={!draft.trim() || busy}>
              {busy ? "Saving…" : "Save"}
            </CTAButton>
          </div>
        </>
      ) : (
        <p className="text-sm text-body leading-relaxed whitespace-pre-wrap">{note.body}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <p className="text-2xs text-subtle">
          <span className="font-medium text-heading">{note.authorName ?? "Unknown"}</span>
          {note.authorRole && (
            <span className="ml-1 uppercase tracking-wider">· {note.authorRole}</span>
          )}
          {" · "}
          {timeAgo(note.createdAt)}
          {note.updatedAt !== note.createdAt && " · edited"}
        </p>
        {isOwn && !editing && (
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-heading"
            >
              Edit
            </button>
            <button
              onClick={() => void remove()}
              disabled={busy}
              className="text-2xs uppercase tracking-wider font-semibold text-subtle hover:text-[var(--color-danger)] disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
