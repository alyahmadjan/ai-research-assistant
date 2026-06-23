"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { listDocuments } from "@/lib/api";
import type { DocumentItem, UploadResponse } from "@/lib/types";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentList } from "@/components/DocumentList";
import { ChatWindow } from "@/components/ChatWindow";
import { BarChart3, FileCheck2, LayoutGrid, Layers3 } from "lucide-react";

const STORAGE_SELECTED = "ara.selected-document-ids";
const STORAGE_RECENT = "ara.recent-upload-ids";

function readStoredIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export default function Page() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [recentUploaded, setRecentUploaded] = useState<string[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const refresh = async () => {
    setLoadingDocs(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      setSelected((prev) => prev.filter((id) => docs.some((doc) => doc.id === id)));
      setRecentUploaded((prev) => prev.filter((id) => docs.some((doc) => doc.id === id)));
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    const storedSelected = readStoredIds(STORAGE_SELECTED);
    const storedRecent = readStoredIds(STORAGE_RECENT);
    if (storedSelected.length) setSelected(storedSelected);
    if (storedRecent.length) setRecentUploaded(storedRecent);
    refresh().catch(() => {});
  }, []);

  useEffect(() => {
    writeStoredIds(STORAGE_SELECTED, selected);
  }, [selected]);

  useEffect(() => {
    writeStoredIds(STORAGE_RECENT, recentUploaded);
  }, [recentUploaded]);

  const handleUploaded = async (uploaded: UploadResponse[]) => {
    // Added: remember the newest upload in localStorage so Ask/Summarize can use it
    // even after refresh without requiring the user to manually select it again.
    const ids = uploaded.map((item) => item.document_id);
    setRecentUploaded(ids);
    setSelected(ids);
    writeStoredIds(STORAGE_RECENT, ids);
    writeStoredIds(STORAGE_SELECTED, ids);
    await refresh();
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next;
    });
  };

  const activeDocumentIds = useMemo(() => {
    if (selected.length) return selected;
    if (recentUploaded.length) return recentUploaded;
    return documents.length ? [documents[0].id] : [];
  }, [selected, recentUploaded, documents]);

  const activeScopeLabel = useMemo(() => {
    if (selected.length) return `${selected.length} selected document(s)`;
    if (recentUploaded.length) return `${recentUploaded.length} recent upload(s)`;
    if (documents.length) return `Latest document: ${documents[0].filename}`;
    return "No documents available";
  }, [selected, recentUploaded, documents]);

  const processedCount = useMemo(() => documents.filter((doc) => doc.status === "processed").length, [documents]);
  const totalChunks = useMemo(() => documents.reduce((acc, doc) => acc + (doc.chunks_created || 0), 0), [documents]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
              <Layers3 className="h-3.5 w-3.5" />
              Portfolio-ready RAG workspace
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Upload research files, ask natural language questions, and get cited answers.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Upload PDF, DOCX, TXT, or HTML documents. The app keeps your latest upload active automatically, but you can also select any combination of documents from the list.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <StatCard icon={<FileCheck2 className="h-4 w-4" />} label="Documents" value={`${documents.length}`} />
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Processed" value={`${processedCount}`} />
            <StatCard icon={<LayoutGrid className="h-4 w-4" />} label="Active scope" value={`${activeDocumentIds.length}`} />
            <StatCard icon={<Layers3 className="h-4 w-4" />} label="Chunks" value={`${totalChunks}`} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <UploadDropzone onUploaded={handleUploaded} />
        <DocumentList
          documents={documents}
          selected={selected}
          onToggle={toggle}
          onRefresh={refresh}
          loading={loadingDocs}
          onSelectAll={() => setSelected(documents.map((doc) => doc.id))}
          onClear={() => setSelected([])}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100 shadow-soft">
        Active scope: <span className="font-semibold text-white">{activeScopeLabel}</span>. If nothing is selected, the app automatically uses the most recent upload.
      </section>

      <ChatWindow selectedDocumentIds={activeDocumentIds} scopeLabel={activeScopeLabel} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="rounded-lg bg-white p-2 text-slate-900 shadow-sm">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
