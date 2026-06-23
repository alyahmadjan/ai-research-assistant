"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { askQuestion, compare, getConversation, summarize } from "@/lib/api";
import { Conversation, SourceItem } from "@/lib/types";
import { AnswerCard } from "./AnswerCard";
import { SourcePanel } from "./SourcePanel";
import { cn } from "@/lib/utils";
import { ArrowRight, Lightbulb, MessageSquareText, PanelTop, Sparkles } from "lucide-react";

type Props = {
  selectedDocumentIds: string[];
  scopeLabel: string;
};

const PROMPTS = {
  chat: [
    "What are the main findings?",
    "What risks or limitations are mentioned?",
    "Explain the most important point in simple terms.",
  ],
  summarize: [
    "Summarize the key takeaways",
    "Summarize only the conclusions",
    "Summarize in bullet points",
  ],
  compare: [
    "Compare the documents by theme",
    "Compare methods and findings",
    "What is similar and what is different?",
  ],
} as const;

export function ChatWindow({ selectedDocumentIds, scopeLabel }: Props) {
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
    if (!selectedDocumentIds.length) return "No documents selected yet. The app will use the most recent upload automatically.";
    return `${selectedDocumentIds.length} document(s) active for this action.`;
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

    if (mode === "compare" && selectedDocumentIds.length < 2) {
      setError("Select at least two documents to compare.");
      return;
    }
    if (!selectedDocumentIds.length) {
      setError("Upload a document or select one from the document list first.");
      return;
    }

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                <PanelTop className="h-3.5 w-3.5" />
                Ask from documents
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Grounded Q&A</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Choose a mode, ask a question, and the app will search the active document scope before answering.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Active scope: <span className="font-semibold text-slate-950">{scopeLabel}</span>
            </div>
          </div>

          <form onSubmit={run} className="mt-6">
            <div className="flex flex-wrap gap-2">
              {(["chat", "summarize", "compare"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                    mode === item
                      ? "bg-slate-950 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
                  )}
                >
                  {item === "chat" ? "Chat" : item === "summarize" ? "Summarize" : "Compare"}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PROMPTS[mode].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>{helperText}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Grounded answers with citations
              </span>
            </div>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={6}
              placeholder={mode === "chat" ? "Ask a question about the active documents..." : "Add a focus, or leave blank to use the default behavior."}
              className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950"
            />
            {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MessageSquareText className="h-4 w-4" />
                {busy ? "Working on the answer..." : "The assistant uses the selected or most recent documents."}
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Processing..." : mode === "chat" ? "Ask" : mode === "summarize" ? "Summarize" : "Compare"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <AnswerCard answer={answer} confidence={confidence} sourceCount={sources.length} />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-950">Conversation history</h2>
            <p className="mt-1 text-sm text-slate-500">A record of prompts and grounded answers from the current session.</p>
            <div className="mt-4 space-y-4">
              {history?.messages?.map((msg, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{msg.role}</p>
                    {msg.confidence ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{msg.confidence}</span> : null}
                  </div>
                  {msg.question ? <p className="mt-2 text-sm font-medium text-slate-950">{msg.question}</p> : null}
                  {msg.answer ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{msg.answer}</p> : null}
                  {msg.citations.length ? <div className="mt-4"><SourcePanel sources={msg.citations} /></div> : null}
                </div>
              ))}
              {!history?.messages?.length ? <p className="text-sm text-slate-500">No conversation loaded yet.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <SourcePanel sources={sources} />
    </div>
  );
}
