"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { askQuestion, compare, getConversation, summarize } from "@/lib/api";
import { Conversation, SourceItem } from "@/lib/types";
import { AnswerCard } from "./AnswerCard";
import { SourcePanel } from "./SourcePanel";

type Props = {
  selectedDocumentIds: string[];
};

export function ChatWindow({ selectedDocumentIds }: Props) {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<string>("medium");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [history, setHistory] = useState<Conversation | null>(null);
  const [mode, setMode] = useState<"chat" | "summarize" | "compare">("chat");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helperText = useMemo(() => {
    if (!selectedDocumentIds.length) return "No document filter selected; search will span all indexed documents.";
    return `${selectedDocumentIds.length} document(s) selected for the next query.`;
  }, [selectedDocumentIds]);

  useEffect(() => {
    if (!conversationId) return;
    getConversation(conversationId)
      .then(setHistory)
      .catch(() => setHistory(null));
  }, [conversationId]);

  const run = async (evt: FormEvent) => {
    evt.preventDefault();
    if (!question.trim() && mode === "chat") return;
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      let result;
      if (mode === "summarize") {
        result = await summarize(selectedDocumentIds, question || undefined);
      } else if (mode === "compare") {
        result = await compare(selectedDocumentIds, question || undefined);
      } else {
        result = await askQuestion({
          conversation_id: conversationId,
          question,
          document_ids: selectedDocumentIds,
        });
      }

      setConversationId(result.conversation_id);
      setAnswer(result.answer);
      setConfidence(result.confidence);
      setSources(result.citations);
      setQuestion("");
      const updated = await getConversation(result.conversation_id);
      setHistory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <form onSubmit={run} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap gap-2">
            {(["chat", "summarize", "compare"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm text-slate-500">{helperText}</p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            placeholder={mode === "chat" ? "Ask a question about the documents..." : "Optional focus/question for the selected documents..."}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-slate-900"
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">{busy ? "Working..." : "Grounded answers with citations."}</p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Processing..." : mode === "chat" ? "Ask" : mode === "summarize" ? "Summarize" : "Compare"}
            </button>
          </div>
        </form>

        {answer ? <AnswerCard answer={answer} confidence={confidence} /> : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Conversation history</h2>
          <div className="mt-4 space-y-4">
            {history?.messages?.map((msg, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{msg.role}</p>
                {msg.question ? <p className="mt-2 text-sm font-medium">{msg.question}</p> : null}
                {msg.answer ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{msg.answer}</p> : null}
              </div>
            ))}
            {!history?.messages?.length ? <p className="text-sm text-slate-500">No conversation loaded yet.</p> : null}
          </div>
        </div>
      </div>

      <SourcePanel sources={sources} />
    </div>
  );
}
