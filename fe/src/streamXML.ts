import type { Step } from "./types/type";
import { StepType } from "./types/type";

type StreamParseResult = {
  newSteps: Step[];
  remainingBuffer: string;
};

export function parseStepsFromStream(buffer: string): StreamParseResult {
  const steps: Step[] = [];

  // This regex waits for a COMPLETE block before matching, which is perfect for streaming.
  const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;

  let match;
  let lastConsumedIndex = 0;

  while ((match = actionRegex.exec(buffer)) !== null) {
    let [, type, filePath, content] = match;
    content = content.trim();

    // ==========================================
    // 🛡️ SANITIZATION LAYER (Crucial for Previews)
    // ==========================================

    // 1. React 18 Deprecation Fix
    if (filePath?.endsWith("main.tsx") || filePath?.endsWith("index.tsx")) {
      if (content.includes("ReactDOM.render")) {
        content = content
          .replace(
            /import ReactDOM from ['"]react-dom['"]/,
            "import ReactDOM from 'react-dom/client'"
          )
          .replace(
            /ReactDOM\.render\([\s\S]*?<([\w]+)\s*\/>[\s\S]*?document\.getElementById\(['"]root['"]\)\s*\)/,
            "ReactDOM.createRoot(document.getElementById('root')!).render(<$1 />)"
          );
      }
    }

    // 2. TSConfig Dependency Fix
    if (filePath?.endsWith("tsconfig.json")) {
      content = JSON.stringify({
        compilerOptions: { 
          target: "ESNext", 
          lib: ["DOM", "DOM.Iterable", "ESNext"], 
          module: "ESNext", 
          skipLibCheck: true, 
          moduleResolution: "bundler", 
          jsx: "react-jsx", 
          strict: true, 
          noEmit: true 
        }
      }, null, 2);
    }

    // 3. Tailwind CDN Fallback
    if (filePath?.endsWith("index.html")) {
      if (!content.includes("cdn.tailwindcss.com")) {
        content = content.replace("<head>", `<head>\n    <script src="https://cdn.tailwindcss.com"></script>`);
      }
    }

    // ==========================================
    // 📦 STEP CREATION
    // ==========================================

    if (type === "file") {
      steps.push({
        id: 0, // assigned by caller
        title: `Create ${filePath || "file"}`,
        description: "",
        type: StepType.CreateFile,
        status: "pending",
        path: filePath,
        code: content
      });
    }

    if (type === "shell") {
      steps.push({
        id: 0,
        title: "Run command",
        description: "",
        type: StepType.RunScript,
        status: "pending",
        code: content
      });
    }

    lastConsumedIndex = actionRegex.lastIndex;
  }

  return {
    newSteps: steps,
    // Safely returns any incomplete <boltAction> tags back to the main loop
    remainingBuffer: buffer.slice(lastConsumedIndex)
  };
}