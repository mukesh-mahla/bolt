import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebcontainer() {
  const [container, setContainer] = useState<WebContainer | null>(
    webContainerInstance
  );

  useEffect(() => {
    let cancelled = false;

    if (webContainerInstance) {
      setContainer(webContainerInstance);
      return;
    }

    if (!bootPromise) {
      bootPromise = WebContainer.boot();
    }

    bootPromise.then((instance) => {
      if (cancelled) return;
      webContainerInstance = instance;
      setContainer(instance);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return container;
}
