"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { uploadDocuments } from "@/lib/api";

type Props = {
  onUploaded: () => void;
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
      await uploadDocuments(files);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-900 p-2 text-white">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Upload documents</h2>
          <p className="text-sm text-slate-500">PDF, DOCX, TXT, HTML</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.html,.htm"
        className="mt-4 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!files.length || isUploading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Uploading..." : "Upload and index"}
        </button>
        <span className="text-sm text-slate-500">{files.length ? `${files.length} file(s) selected` : "No files selected"}</span>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
