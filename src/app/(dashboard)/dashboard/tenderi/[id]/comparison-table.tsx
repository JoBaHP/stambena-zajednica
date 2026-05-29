"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function ComparisonTable({ content }: { content: string }) {
  return (
    <div className="overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <table className="w-full text-sm border-collapse">{children}</table>
          ),
          thead: ({ children }) => (
            <thead className="bg-indigo-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-indigo-200 px-3 py-2 text-left text-xs font-semibold text-indigo-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-2 text-xs text-foreground align-top">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-slate-50/50">{children}</tr>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
