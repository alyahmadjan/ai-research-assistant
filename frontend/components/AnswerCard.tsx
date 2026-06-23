"use client";

import { Copy, Sparkles, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  answer: string;
  confidence?: string;
  sourceCount?: number;
};

export function AnswerCard({ answer, confidence, sourceCount }: Props) {
  const [copied, setCopied] = useState(false);

  const confidenceLabel = useMemo(() => confidence ?? "medium", [confidence]);

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-900 p-3 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Answer</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Confidence: {confidenceLabel}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                {sourceCount ?? 0} cited passage{(sourceCount ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={copyAnswer}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy answer"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-800">
        {answer ? (
          <pre className="whitespace-pre-wrap font-sans">{answer}</pre>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Your answer will appear here after you ask a question.
          </div>
        )}
      </div>
    </div>
  );
}
