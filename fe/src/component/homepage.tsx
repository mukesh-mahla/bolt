
import axios from "axios";
import { ChevronsRight,  Loader2 } from "lucide-react";
import { useRef, useState } from "react";


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 

export default function HomePage() {
  
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendPrompt() {
    if (loading) return;

    const textvalue = textRef.current?.value?.trim() ?? "";
    if (!textvalue) return;

    try {
      setLoading(true);

      const response = await axios.post(`${BACKEND_URL}/template`, {
        Text: textvalue,
      });

      const { prompt, beautyPrompt } = response.data;

         sessionStorage.setItem(
          "project:init",
          JSON.stringify({ prompt, beautyPrompt, userPrompt:textvalue })
         );

  
  window.location.replace("/project");
       
    } catch (err) {
      console.error("Template error:", err);
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center">
      
      {/* Logo */}
      <div className="absolute top-4 left-4 px-4 py-2 bg-white/90 rounded-lg text-black font-serif shadow">
        Bolt.new
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-xl p-6">
        
        <h1 className="text-3xl font-serif text-center mb-6 text-gray-900">
          What’s in your mind today?
        </h1>

        <textarea
          ref={textRef}
          placeholder="Build a calculator app, todo app, landing page..."
          className="w-full h-28 p-4 rounded-xl border border-gray-300 resize-none
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     text-gray-900 placeholder-gray-400"
          disabled={loading}
        />

        <button
          onClick={sendPrompt}
          disabled={loading}
          className={`
            mt-4 w-full flex items-center justify-center gap-2
            px-4 py-3 rounded-xl font-medium text-white
            transition-all duration-200
            ${loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]"}
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

        <p className="mt-3 text-xs text-gray-500 text-center">
          Describe what you want to build. Frontend by default.
        </p>
      </div>
    </div>
  );
}
