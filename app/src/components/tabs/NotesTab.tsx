import { Card } from "../ui/Card";

export function NotesTab() {
  return (
    <div className="flex flex-col gap-5 p-6 overflow-y-auto scrollbar-thin flex-1">
      <h2 className="text-2xl font-semibold text-heading">Strategy Notes</h2>
      <Card className="min-h-[200px]">
        <textarea
          placeholder="Add call notes, follow-up actions, or strategy observations here…"
          className="w-full h-48 bg-transparent text-sm text-body resize-none outline-none placeholder:text-subtle leading-relaxed"
        />
      </Card>
    </div>
  );
}
