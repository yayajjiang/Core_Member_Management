'use client'

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="text-sm px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 shrink-0"
    >
      复制
    </button>
  )
}
