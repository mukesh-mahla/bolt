import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebcontainer() {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!bootPromise) {
        bootPromise = WebContainer.boot();
      }

      const instance = await bootPromise;
      if (cancelled) return;

      webContainerInstance = instance;
      setContainer(instance);

      // 🔴 CRITICAL: let runtime loader unlock
      await Promise.resolve();
      await new Promise(r => setTimeout(r, 0));

      if (!cancelled) {
        setRuntimeReady(true);
      }
    }

    if (webContainerInstance) {
      setContainer(webContainerInstance);
      setRuntimeReady(true);
    } else {
      boot();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { container, runtimeReady };
}
