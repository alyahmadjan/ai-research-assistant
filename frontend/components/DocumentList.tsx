"use client";

import { CheckSquare, FileText, RefreshCcw, Square, Trash2 } from "lucide-react";
import { deleteDocument } from "@/lib/api";
import { DocumentItem } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type Props = {
  documents: DocumentItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
};

const statusTone: Record<string, string> = {
  processed: "bg-emerald-50 text-emerald-700",
  extracting: "bg-amber-50 text-amber-700",
  queued: "bg-slate-100 text-slate-600",
  failed: "bg-rose-50 text-rose-700",
};

export function DocumentList({ documents, selected, onToggle, onRefresh, loading, onSelectAll, onClear }: Props) {
  const remove = async (id: string) => {
    await deleteDocument(id);
    onRefresh();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
          <p className="mt-1 text-sm text-slate-500">
            {documents.length} uploaded • {selected.length} selected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onSelectAll} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <CheckSquare className="h-4 w-4" /> Select all
          </button>
          <button onClick={onClear} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <Square className="h-4 w-4" /> Clear
          </button>
          <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {documents.map((doc) => {
          const isSelected = selected.includes(doc.id);
          const statusClass = statusTone[doc.status] ?? "bg-slate-100 text-slate-600";
          return (
            <div
              key={doc.id}
              className={cn(
                "rounded-2xl border p-4 transition",
                isSelected ? "border-slate-950 bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <button onClick={() => onToggle(doc.id)} className="flex flex-1 gap-3 text-left">
                  <div className="mt-1 rounded-xl bg-slate-900 p-2 text-white">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-slate-950">{doc.filename}</p>
                      {isSelected ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">selected</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusClass)}>{doc.status}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{doc.file_type.toUpperCase()}</span>
                      <span className="text-sm text-slate-500">{doc.pages} pages</span>
                      <span className="text-sm text-slate-500">{doc.chunks_created} chunks</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(doc.created_at)}</p>
                  </div>
                </button>
                <button onClick={() => remove(doc.id)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Delete document">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {!documents.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            {loading ? "Loading documents..." : "No documents yet. Upload one to begin."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
