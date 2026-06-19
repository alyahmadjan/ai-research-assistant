import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import { queryDocuments } from '../api'

const SUGGESTED_QUESTIONS = [
  'What are the main findings of the selected papers?',
  'What methodology was used in the research?',
  'Compare the arguments across these papers.',
  'What limitations do the authors acknowledge?',
  'What future work do the authors suggest?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
        isUser ? 'bg-brand-600' : 'bg-gray-100'
      )}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-brand-600" />
        }
      </div>

      <div className={clsx(
        'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
        isUser
          ? 'bg-brand-600 text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
      )}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
          >
            {msg.content}
          </ReactMarkdown>
        )}
        {msg.chunksUsed != null && (
          <p className="mt-2 text-xs text-gray-400 border-t border-gray-100 pt-2">
            Based on {msg.chunksUsed} retrieved chunk{msg.chunksUsed !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel({ selectedDocIds, hasDocuments, onSourcesChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (question) => {
    const q = (question || input).trim()
    if (!q || loading) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    onSourcesChange([])

    try {
      const result = await queryDocuments(q, selectedDocIds)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.answer, chunksUsed: result.chunks_used },
      ])
      onSourcesChange(result.sources)
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">Ask your documents anything</h3>
              <p className="text-sm text-gray-400 mt-1">
                {hasDocuments
                  ? 'Select documents on the left, then ask a question below.'
                  : 'Upload a document on the left to get started.'}
              </p>
            </div>

            {hasDocuments && (
              <div className="w-full max-w-md space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Try asking…</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => <Message key={i} msg={msg} />)
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        {selectedDocIds.length === 0 && hasDocuments && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            No documents selected — searching across all uploaded documents.
          </p>
        )}
        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-32 scrollbar-thin"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
