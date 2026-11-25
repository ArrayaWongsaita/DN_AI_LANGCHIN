export function Sources({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 border-t pt-2 text-xs text-slate-500">
      <span className="font-medium">แหล่งที่มา:</span>
      <ul className="mt-1 list-inside list-disc">
        {[...new Set(sources)].map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
