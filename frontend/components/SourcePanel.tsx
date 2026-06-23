"use client";

import { FileText, Link2 } from "lucide-react";
import { SourceItem } from "@/lib/types";

type Props = {
  sources: SourceItem[];
};

export function SourcePanel({ sources }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Sources</h2>
          <p className="mt-1 text-sm text-slate-500">Cited passages used to ground the answer.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{sources.length} passages</div>
      </div>

      <div className="mt-4 space-y-3">
        {sources.map((source) => (
          <article key={source.chunk_id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-900 p-2 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-950">{source.document_filename}</p>
                  <p className="text-xs text-slate-500">
                    {source.page ? `Page ${source.page}` : "Page n/a"} • Chunk {source.chunk_id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <p className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Score {source.score?.toFixed(3) ?? "n/a"}
              </p>
            </div>
            <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-700">{source.text_preview}</p>
          </article>
        ))}
        {!sources.length ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            <Link2 className="h-4 w-4" />
            Citations will appear here after you ask a question.
          </div>
        ) : null}
      </div>
    </div>
  );
}
