"use client";

import { SourceItem } from "@/lib/types";

type Props = {
  sources: SourceItem[];
};

export function SourcePanel({ sources }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold">Sources</h2>
      <div className="mt-4 space-y-3">
        {sources.map((source) => (
          <div key={source.chunk_id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{source.document_filename}</p>
              <p className="text-xs text-slate-500">Score {source.score?.toFixed(3) ?? "n/a"}</p>
            </div>
            <p className="text-xs text-slate-500">Page {source.page ?? "n/a"} • Chunk {source.chunk_id.slice(0, 8)}</p>
            <p className="mt-2 text-sm text-slate-700">{source.text_preview}</p>
          </div>
        ))}
        {!sources.length ? <p className="text-sm text-slate-500">Citations appear here after you ask a question.</p> : null}
      </div>
    </div>
  );
}
