import { WebContainer } from "@webcontainer/api";
import { useEffect, useRef, useState } from "react";

interface PreviewFrameProps {
  webContainer: WebContainer;
  ready: boolean;
  runtimeReady: boolean;
}

export function PreviewFrame({ webContainer, ready,runtimeReady }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;

    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      unsubscribe = webContainer.on("server-ready", (_port, newUrl) => {
        setUrl(prev => (prev !== newUrl ? newUrl : prev));
        console.log("Dev server ready at:", newUrl);
      });

      try {
        // 🔴 CRITICAL: wait for runtime loader
        await Promise.resolve();
        await new Promise(r => setTimeout(r, 0));

        // ❌ DO NOT run npm install here
      const proc =  await webContainer.spawn("npm", ["run", "dev"],{cwd:"/project"});
      proc.output.pipeTo(
  new WritableStream({
    write(data) {
      console.log("[dev server]", data);
    },
  })
);
      } catch (e) {
        console.error("Preview failed", e);
      }
    };

    start();

    return () => unsubscribe?.();
  }, [ready, webContainer]);
  console.log("PreviewFrame render: ", { ready, url });

  if (!ready) {
    return <div className="h-full flex items-center justify-center">Preparing project…</div>;
  }
  if (!runtimeReady) {
    return <div className="h-full flex items-center justify-center">Starting runtime…</div>;
  }

  if (!url) {
    return <div className="h-full flex items-center justify-center">Starting dev server…</div>;
  }

  return <iframe  src={url} className="w-full h-full border-none" />;
}
