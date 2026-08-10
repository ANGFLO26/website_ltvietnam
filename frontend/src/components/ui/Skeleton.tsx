export function Skeleton({ label }: { label: string }) {
  return (
    <div className="animate-pulse space-y-3" aria-label={label} aria-busy="true">
      <div className="h-6 w-2/5 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-4/5 rounded bg-slate-200" />
    </div>
  );
}
