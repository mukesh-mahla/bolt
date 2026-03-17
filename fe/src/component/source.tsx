import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import { StepType, type FileItem, type Step } from "../types/type";
import { StepsList } from "../componets/steplist";
import { CodeEditor } from "../componets/codeEditor";
import { FileExplorer } from "../componets/fileExplorer";
import { useWebcontainer } from "../hooks/useWebcontainer";
import { PreviewFrame } from "../componets/previewFrame";
import { parseStepsFromStream } from "../streamXML";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function Source() {
  const [step, setStep] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [projectReady, setProjectReady] = useState(false);
  const [done, setDone] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActivetab] = useState<"code" | "preview">("code");
  const [llmMessages, setLlmMessages] = useState<{ role: "user" | "model"; content: string }[]>([]);

  const followRef = useRef<HTMLTextAreaElement | null>(null);
  const stepIdRef = useRef(1);
  const artifactParsedRef = useRef(false);
  const hasMountedRef = useRef(false);
  const { container, runtimeReady } = useWebcontainer();

  const projectData = useMemo(() => {
    try {
      const saved = sessionStorage.getItem("project:init");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, []);

  if (!projectData) {
    return (
      <div className="h-screen flex items-center justify-center text-zinc-400">
        No active project. Go back and create one.
      </div>
    );
  }

  const { prompt, beautyPrompt, userPrompt } = projectData;

  const fetchDataStream = async () => {
    if (isStreaming) return;
    setIsStreaming(true);

    const newMessages: { role: "user" | "model"; content: string }[] = [
      { role: "user", content: `${beautyPrompt} ${prompt} ${userPrompt}` }
    ];
    setLlmMessages(newMessages);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessages })
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        if (!artifactParsedRef.current) {
          const match = buffer.match(/<boltArtifact[^>]*title="([^"]*)"/);
          if (match) {
            setStep(prev => [...prev, { id: stepIdRef.current++, title: match[1], description: "", type: StepType.CreateFolder, status: "pending" }]);
            artifactParsedRef.current = true;
          }
        }

        const { newSteps, remainingBuffer } = parseStepsFromStream(buffer);
        if (newSteps.length > 0) {
          setStep(prev => [...prev, ...newSteps.map(s => ({ ...s, id: stepIdRef.current++ }))]);
        }
        buffer = remainingBuffer;
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
      setProjectReady(true);
    }
  };

  useEffect(() => {
    fetchDataStream();
  }, []);

  // 2. Process Steps into File Tree
  useEffect(() => {
    const pendingCreateSteps = step.filter(s => s.status === "pending" && s.type === StepType.CreateFile);
    if (pendingCreateSteps.length === 0) return;

    setFiles(prevFiles => {
      let updatedFiles: FileItem[] = JSON.parse(JSON.stringify(prevFiles));
      for (const s of pendingCreateSteps) {
        const parts = s.path?.split("/").filter(Boolean) ?? [];
        let currentLevel = updatedFiles;
        let currentPath = "";

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath += `/${part}`;
          const isLast = i === parts.length - 1;

          if (isLast) {
            const existing = currentLevel.find(f => f.path === currentPath);
            if (existing && existing.type === "file") {
              existing.content = s.code;
            } else {
              currentLevel.push({ name: part, type: "file", path: currentPath, content: s.code });
            }
          } else {
            let folder = currentLevel.find(f => f.path === currentPath);
            if (!folder) {
              folder = { name: part, type: "folder", path: currentPath, children: [] };
              currentLevel.push(folder);
            }
            currentLevel = folder.children!;
          }
        }
      }
      return updatedFiles;
    });

    setStep(prev => prev.map(s => (s.status === "pending" && s.type === StepType.CreateFile ? { ...s, status: "completed" } : s)));
  }, [step.length]);

  // 3. WebContainer Mounting (FIXED LOGIC)
  const createMountStructure = (fileItems: FileItem[]): Record<string, any> => {
    const structure: Record<string, any> = {};
    fileItems.forEach(item => {
      if (item.type === "file") {
        structure[item.name] = { file: { contents: item.content || "" } };
      } else {
        structure[item.name] = { directory: createMountStructure(item.children || []) };
      }
    });
    return structure;
  };

  useEffect(() => {
    // CRITICAL: We need to wait for projectReady, !isStreaming, AND the package.json to exist in state
    if (!container || hasMountedRef.current || !projectReady || isStreaming) return;

    // Helper to find package.json in the flat or nested files state
    const findPackageJson = (items: FileItem[]): boolean => {
      return items.some(item => item.name === 'package.json' || (item.children && findPackageJson(item.children)));
    };

    if (!findPackageJson(files)) {
      console.log("Waiting for package.json to be parsed...");
      return; 
    }

    const bootContainer = async () => {
      try {
        hasMountedRef.current = true;
        console.log("Mounting files to WebContainer...");
        const structure = createMountStructure(files);
        await container.mount(structure);

        console.log("Starting npm install...");
        const proc = await container.spawn("npm", ["install"]);
        proc.output.pipeTo(new WritableStream({
          write(data) { console.log("[npm install]", data); }
        }));

        const exitCode = await proc.exit;
        if (exitCode === 0) {
          console.log("npm install finished successfully");
          setDone(true);
        }
      } catch (err) {
        console.error("Mounting failed:", err);
        hasMountedRef.current = false;
      }
    };

    bootContainer();
  }, [container, projectReady, isStreaming, files]); // Added files as dependency

  async function handelclick() {
    const followValue = followRef.current?.value?.trim();
    if (!followValue || isStreaming) return;
    const newMessages: { role: "user" | "model"; content: string }[] = [...llmMessages, { role: "user", content: followValue }];
    setLlmMessages(newMessages);
    followRef.current!.value = "";
    try {
      const res = await axios.post(`${BACKEND_URL}/chat`, { message: newMessages });
      setLlmMessages(prev => [...prev, { role: "model", content: res.data.AiRes }]);
      const parsedStep = parseStepsFromStream(res.data.AiRes).newSteps;
      setStep(prev => [...prev, ...parsedStep.map(s => ({ ...s, id: stepIdRef.current++ }))]);
    } catch (e) { console.error(e); }
  }

  return (
    <div className="w-screen h-screen bg-[#0f0f12] text-zinc-200 flex flex-col">
      <header className="h-11 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#121216]">
        <span className="text-sm text-zinc-400">bolt.new / workspace</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 truncate max-w-[240px]">{selectedFile?.path ?? "No file selected"}</span>
          <div className="h-5 w-px bg-zinc-800" />
          <div className="flex rounded-lg border border-zinc-800 bg-[#0f0f12] p-0.5">
            <button onClick={() => setActivetab("code")} className={`px-3 py-1 text-xs rounded-md ${activeTab === "code" ? "bg-zinc-800 text-white" : "text-zinc-400"}`}>Code</button>
            <button disabled={!done} onClick={() => setActivetab("preview")} className={`px-3 py-1 text-xs rounded-md ${activeTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400"} disabled:opacity-50`}>Preview</button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[260px] bg-[#111114] border-r border-zinc-800 flex flex-col">
          <div className="flex-1 overflow-auto no-scrollbar">
            <div className="px-3 py-2 text-xs font-medium uppercase text-zinc-500">Steps</div>
            <StepsList steps={step} currentStep={currentStep} onStepClick={setCurrentStep} />
          </div>
          <div className="p-3 border-t border-zinc-800 bg-[#111114]">
            <div className="flex items-end gap-2 bg-[#151518] border border-zinc-800 rounded-lg px-2 py-2">
              <textarea ref={followRef} rows={1} placeholder="Ask something..." className="flex-1 bg-transparent text-sm outline-none resize-none" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handelclick())} />
              <button onClick={handelclick} disabled={isStreaming} className={`h-8 w-8 rounded-md ${isStreaming ? "bg-zinc-700" : "bg-purple-600"}`}>➤</button>
            </div>
          </div>
        </aside>
        <aside className="w-[240px] bg-[#111114] border-r border-zinc-800 overflow-auto no-scrollbar">
          <div className="px-3 py-2 text-xs font-medium uppercase text-zinc-500">Files</div>
          <FileExplorer files={files} onFileSelect={setSelectedFile} />
        </aside>
        <main className="flex-1 bg-[#0f0f12] p-4 overflow-hidden">
          <div className="h-full rounded-xl bg-[#151518] border border-zinc-800 overflow-hidden">
            {activeTab === "code" ? <CodeEditor file={selectedFile} /> : <PreviewFrame webContainer={container!} ready={done} runtimeReady={runtimeReady} />}
          </div>
        </main>
      </div>
    </div>
  );
}