import { WebContainer } from "@webcontainer/api";
import { useEffect, useRef, useState } from "react";

interface PreviewFrameProps {
  webContainer: WebContainer;
  ready: boolean; // Files are mounted and npm install is done
  runtimeReady: boolean; // WebContainer boot sequence finished
}

export function PreviewFrame({ webContainer, ready, runtimeReady }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    // We only start the dev server once files are ready AND the runtime is live
    if (!ready || !runtimeReady || startedRef.current) return;
    
    startedRef.current = true;
    let shellProcess: any;

    const startDevServer = async () => {
      // 1. Attach listener BEFORE spawning the process
      const unsubscribe = webContainer.on("server-ready", (port, newUrl) => {
        console.log(`Dev server ready on port ${port}: ${newUrl}`);
        setUrl(newUrl);
      });

      try {
        console.log("Spawning npm run dev...");
        
        // 2. Spawn the dev server
        shellProcess = await webContainer.spawn("npm", ["run", "dev"]);

        // 3. Log output to console for debugging
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              console.log("[dev server output]:", data);
            },
          })
        );

        // Handle process exit
        shellProcess.exit.then((code: number) => {
          if (code !== 0) {
            console.error("Dev server crashed with code", code);
            startedRef.current = false; // Allow restart if it crashes
          }
        });

      } catch (e) {
        console.error("Failed to start dev server:", e);
      }

      return unsubscribe;
    };

    const cleanupPromise = startDevServer();

    return () => {
      // Cleanup: stop the process and remove listener
      cleanupPromise.then(unsubscribe => unsubscribe?.());
      if (shellProcess) {
        shellProcess.kill();
      }
    };
  }, [ready, runtimeReady, webContainer]);

  // UI States
  if (!ready || !runtimeReady) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        <span>Preparing environment...</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
        <div className="animate-pulse">⚡ Starting dev server...</div>
        <p className="text-[10px] text-zinc-600">Check browser console for logs</p>
      </div>
    );
  }

  return (
    <iframe 
      src={url} 
      title="Preview"
      className="w-full h-full border-none bg-white" 
    />
  );
}