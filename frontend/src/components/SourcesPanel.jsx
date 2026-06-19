import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const score = Math.round(source.relevance_score * 100)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{source.filename}</p>
          <p className="text-xs text-gray-400 mt-0.5">Page {source.page}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full',
                  score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-yellow-400' : 'bg-gray-300'
                )}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{score}%</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-50">
          <p className="text-xs text-gray-500 leading-relaxed mt-2 italic">"{source.excerpt}"</p>
        </div>
      )}
    </div>
  )
}

export default function SourcesPanel({ sources }) {
  if (!sources || sources.length === 0) return null

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">Sources</h2>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{sources.length} chunk{sources.length !== 1 ? 's' : ''} retrieved</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2">
        {sources.map((source, i) => (
          <SourceCard key={`${source.doc_id}-${source.page}-${i}`} source={source} index={i} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Relevance score = cosine similarity between query and chunk embeddings.
        </p>
      </div>
    </aside>
  )
}
