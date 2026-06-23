"use client";

import { useRef, useState } from "react";
import { Upload, WandSparkles } from "lucide-react";
import { uploadDocuments } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";

type Props = {
  onUploaded: (documents: UploadResponse[]) => void;
};

export function UploadDropzone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!files.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadDocuments(files);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      // Added: bubble up the uploaded document IDs so the page can auto-select
      // the newest upload and treat it as the active scope immediately.
      onUploaded(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-900 p-3 text-white">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Upload documents</h2>
          <p className="text-sm text-slate-500">PDF, DOCX, TXT, HTML</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-transparent text-center">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.html,.htm"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-sm">
            <WandSparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Drop files here or click to browse</p>
            <p className="mt-1 text-sm text-slate-500">Upload one or many documents, then ask questions right away.</p>
          </div>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={!files.length || isUploading}
          className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Uploading..." : "Upload and index"}
        </button>
        <span className="text-sm text-slate-500">{files.length ? `${files.length} file(s) selected` : "No files selected"}</span>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
