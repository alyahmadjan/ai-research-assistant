"use client";

import { useEffect, useState } from "react";
import { listDocuments } from "@/lib/api";
import { DocumentItem } from "@/lib/types";
import { DocumentList } from "@/components/DocumentList";
import { ChatWindow } from "@/components/ChatWindow";

export default function ChatPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const refresh = async () => {
    setDocuments(await listDocuments());
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
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
      <ChatWindow
        selectedDocumentIds={selected}
        scopeLabel={
          selected.length
            ? `${selected.length} selected document(s)`
            : documents.length
            ? `Latest document: ${documents[0].filename}`
            : "No documents available"
        }
      />
    </div>
  );
}
