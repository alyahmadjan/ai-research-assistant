"use client";

import { useEffect, useState } from "react";
import { listDocuments } from "@/lib/api";
import { DocumentItem } from "@/lib/types";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentList } from "@/components/DocumentList";

export default function UploadPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const refresh = async () => {
    setDocuments(await listDocuments());
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <UploadDropzone onUploaded={refresh} />
      <DocumentList
        documents={documents}
        selected={selected}
        onToggle={(id) =>
          setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
        onRefresh={refresh}
        onSelectAll={() => setSelected(documents.map((doc) => doc.id))}
        onClear={() => setSelected([])}
      />
    </div>
  );
}
