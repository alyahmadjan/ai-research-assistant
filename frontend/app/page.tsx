"use client";

import { useEffect, useState } from "react";
import { listDocuments } from "@/lib/api";
import { DocumentItem } from "@/lib/types";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentList } from "@/components/DocumentList";
import { ChatWindow } from "@/components/ChatWindow";

export default function Page() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const refresh = async () => {
    const docs = await listDocuments();
    setDocuments(docs);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <UploadDropzone onUploaded={refresh} />
        <DocumentList documents={documents} selected={selected} onToggle={toggle} onRefresh={refresh} />
      </section>
      <ChatWindow selectedDocumentIds={selected} />
    </div>
  );
}
