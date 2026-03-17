"use client"

import axios from "axios"
import { ChevronsRight, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export default function HomePage() {
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
        textRef.current?.focus()
  },[])
  
  async function sendPrompt() {
    if (loading) return

    const textvalue = textRef.current?.value?.trim() ?? ""
    if (!textvalue) return

    try {
      setLoading(true)

      const response = await axios.post(`${BACKEND_URL}/template`, {
        Text: textvalue,
      })

      const { prompt, beautyPrompt } = response.data

      sessionStorage.setItem(
        "project:init",
        JSON.stringify({ prompt, beautyPrompt, userPrompt: textvalue })
      )

      window.location.replace("/project")
    } catch (err) {
      console.error("Template error:", err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white px-4">

      {/* Logo */}
      <div className="absolute top-6 left-6 text-lg font-semibold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]">
        Bolt.new
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white/[0.03] border border-white/10 rounded-xl p-8">

        <h1 className="text-3xl font-semibold text-center">
          What do you want to build?
        </h1>

        <p className="text-sm text-neutral-400 text-center mt-2">
          Describe your idea and we’ll generate a project
        </p>

        <textarea
          ref={textRef}
          placeholder="Build a calculator app, todo app, landing page..."
          disabled={loading}
          className="
            w-full mt-6 h-32 px-4 py-3 rounded-md
            bg-black border border-white/10
            focus:outline-none focus:border-purple-500
            resize-none text-sm
          "
        />

        <button
          onClick={sendPrompt}
          disabled={loading}
          className={`
            mt-5 w-full h-12 rounded-md flex items-center justify-center gap-2
            font-medium transition-all
            ${loading
              ? "bg-white/10 text-neutral-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 active:scale-95"}
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Building...
            </>
          ) : (
            <>
              Build Now
              <ChevronsRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-neutral-500 text-center">
          Frontend project by default. Be specific for better results.
        </p>

      </div>
    </div>
  )
}