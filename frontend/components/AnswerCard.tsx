"use client";

import { Copy, Sparkles } from "lucide-react";

type Props = {
  answer: string;
  confidence?: string;
};

export function AnswerCard({ answer, confidence }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-900 p-2 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Answer</h2>
            <p className="text-sm text-slate-500">Confidence: {confidence ?? "medium"}</p>
          </div>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(answer)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <Copy className="h-4 w-4" /> Copy
        </button>
      </div>
      <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-800">{answer}</p>
    </div>
  );
}
