"use client";

import { Trash2, FileText, RefreshCcw } from "lucide-react";
import { deleteDocument } from "@/lib/api";
import { DocumentItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Props = {
  documents: DocumentItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onRefresh: () => void;
};

export function DocumentList({ documents, selected, onToggle, onRefresh }: Props) {
  const remove = async (id: string) => {
    await deleteDocument(id);
    onRefresh();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-slate-500">{documents.length} uploaded</p>
        </div>
        <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {documents.map((doc) => {
          const isSelected = selected.includes(doc.id);
          return (
            <div key={doc.id} className={`rounded-2xl border p-4 ${isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <FileText className="mt-1 h-5 w-5 text-slate-500" />
                  <div>
                    <button onClick={() => onToggle(doc.id)} className="text-left font-medium hover:underline">
                      {doc.filename}
                    </button>
                    <p className="text-sm text-slate-500">
                      {doc.file_type.toUpperCase()} • {doc.status} • {doc.pages} pages • {doc.chunks_created} chunks
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => remove(doc.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {!documents.length ? <p className="text-sm text-slate-500">No documents yet. Upload one to begin.</p> : null}
      </div>
    </div>
  );
}
