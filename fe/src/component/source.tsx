import { useEffect, useRef, useState } from "react"
import axios from "axios"

import { parseStepsFromResponse } from "../parser"
import { StepType, type FileItem, type Step } from "../types/type"
import { StepsList } from "../componets/steplist"
import { CodeEditor } from "../componets/codeEditor"
import { FileExplorer } from "../componets/fileExplorer"
import { useWebcontainer } from "../hooks/useWebcontainer"

import { PreviewFrame } from "../componets/previewFrame"
import { parseStepsFromStream } from "../streamXML"


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export default function Source() {
  // const [data, setData] = useState("")
  const [step, setStep] = useState<Step[]>([])
  const [fileReady, setFileReady] = useState(false);  
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [projectReady, setProjectReady] = useState(false);
  const [done, setDone] = useState(false);

  const [llmMessages, setLlmMessages] = useState<{ role: "user" | "model", content: string; }[]>([]);

  const followRef = useRef<HTMLTextAreaElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const stepIdRef = useRef(1);
  const artifactParsedRef = useRef(false);
  const [activeTab, setActivetab] = useState<"code" | "preview">("code")
  const hasMountedRef = useRef(false);
  const parsedActionCountRef = useRef(0);
  let prompt = "";
  let beautyPrompt = "";
  let userPrompt = "";

  try {
    const saved = sessionStorage.getItem("project:init");
    if (!saved) throw new Error("No project data");

    ({ prompt, beautyPrompt, userPrompt } = JSON.parse(saved));
  } catch {
    return (
      <div className="h-screen flex items-center justify-center text-zinc-400">
        No active project. Go back and create one.
      </div>
    );
  }


  const {container, runtimeReady} = useWebcontainer()

  const isIsolated =
    typeof window !== "undefined" &&
    (window as any).crossOriginIsolated === true;

  const fetchDataStream = async () => {
    console.log("Starting data stream...");
    setIsStreaming(true);

    const newMessages: { role: "user" | "model", content: string; }[] = [
      { role: "user", content: `${beautyPrompt} ${prompt} ${userPrompt}` }
    ];

    setLlmMessages(newMessages);

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

      // 🔑 1. Parse artifact title ONCE
      if (!artifactParsedRef.current) {
        const match = buffer.match(/<boltArtifact[^>]*title="([^"]*)"/);
        if (match) {
          setStep(prev => [
            ...prev,
            {
              id: stepIdRef.current++,
              title: match[1],
              description: "",
              type: StepType.CreateFolder,
              status: "pending"
            }
          ]);
          artifactParsedRef.current = true;
        }
      }
      console.log("parsing the first block")
    
      const { newSteps, remainingBuffer } =
  parseStepsFromStream(buffer);

if (newSteps.length) {
  parsedActionCountRef.current += newSteps.length;

  setStep(prev => [
    ...prev,
    ...newSteps.map(s => ({
      ...s,
      id: stepIdRef.current++
    }))
  ]);
}

buffer = remainingBuffer;

    }
    

    setProjectReady(true);  
    setIsStreaming(false);
    
  };


  useEffect(() => {
    console.log("calling Fetching function for data stream...");
    fetchDataStream();
  }, []);

  useEffect(() => {
    console.log("starting the current step");
    if (currentStep === -1 && step.length > 0) {
      setCurrentStep(step[0].id);
    }
  }, [step])

  useEffect(() => {

    console.log("Processing pending create steps");
  

    const pendingCreateSteps = step.filter(
      s => s.status === "pending" && s.type === StepType.CreateFile
    );

    if (pendingCreateSteps.length === 0) return;

    setFiles(prevFiles => {
      // Deep clone to avoid mutating previous state
      let updatedFiles: FileItem[] = JSON.parse(JSON.stringify(prevFiles));

      for (const step of pendingCreateSteps) {
        const parts = step.path?.split("/") ?? [];
        let currentLevel = updatedFiles;
        let currentPath = "";

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath += `/${part}`;
          const isLast = i === parts.length - 1;

          if (isLast) {
            const existing = currentLevel.find(f => f.path === currentPath);

            if (existing && existing.type === "file") {
              // safe mutation (this object was created in this update)
              existing.content = step.code;
            } else {
              currentLevel.push({
                name: part,
                type: "file",
                path: currentPath,
                content: step.code
              });
            }
          } else {
            let folder = currentLevel.find(f => f.path === currentPath);

            if (!folder) {
              folder = {
                name: part,
                type: "folder",
                path: currentPath,
                children: []
              };
              currentLevel.push(folder);
            }

            currentLevel = folder.children!;
          }
        }
      }
      ;
      return updatedFiles;
    });
    console.log("files", files);

    
    setStep(prev =>
      prev.map(s =>
        s.status === "pending" && s.type === StepType.CreateFile
          ? { ...s, status: "completed" }
          : s
      )
    );
  }, [step]);



  const createMountStructure = (files: FileItem[]): Record<string, any> => {
    if(fileReady) return {};
    if(!projectReady) return {};
    console.log("Creating mount structure for WebContainer...");
    const mountStructure: Record<string, any> = {};

    const processFile = (file: FileItem, isRootFolder: boolean) => {
      if (file.type === 'folder') {

        mountStructure[file.name] = {
          directory: file.children ?
            Object.fromEntries(
              file.children.map(child => [child.name, processFile(child, false)])
            )
            : {}
        };
      } else if (file.type === 'file') {
        if (isRootFolder) {
          mountStructure[file.name] = {
            file: {
              contents: file.content || ''
            }
          };
        } else {
          // For files, create a file entry with contents
          return {
            file: {
              contents: file.content || ''
            }
          };
        }
      }

      return mountStructure[file.name];
    };


    files.forEach(file => processFile(file, true));
    setFileReady(true);
    
    return mountStructure;
  };

  const countref = useRef(0);

  useEffect(() => {
    console.log("entered in webcontainer mount useEffect");
    if (!container || !isIsolated || hasMountedRef.current ||  !projectReady || isStreaming) return;
   


    (async () => {
       console.log("Mounting files into WebContainer...");
    const structure = createMountStructure(files);
   
     await container.mount({project:{
        directory:structure
      }});
    
    console.log("installing dependencies...");
 
    const proc = await container.spawn(
      "npm",
      ["install"],
      {cwd:"/project"}
    );

    proc.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log("[npm install]", data);
        },
      })
    );
  })()
  setDone(true)
          countref.current += 1;
          console.log(`Mounted structure into WebContainer ${countref.current} time(s).`);
    hasMountedRef.current = true;
  }, [container, isIsolated, files.length, projectReady]);

  function handleStepClick(stepId: number) {
    setCurrentStep(stepId);

  }
  async function handelclick() {

    const followValue = followRef.current?.value?.trim();
    if (!followValue) return;

    const MAX_MESSAGES = 10;

    const newMessages: { role: "user" | "model", content: string }[] = [
      ...llmMessages,
      { role: "user", content: followValue }
    ];

    const trimmedMessages: { role: "user" | "model", content: string }[] =
      newMessages.length > MAX_MESSAGES
        ? newMessages.slice(-MAX_MESSAGES)
        : newMessages;

    setLlmMessages(trimmedMessages);
    followRef.current!.value = "";

    const res = await axios.post(`${BACKEND_URL}/chat`, {
      message: trimmedMessages
    });

    setLlmMessages(prev => [
      ...prev,
      { role: "model", content: res.data.AiRes }
    ]);

    const parsedStep = parseStepsFromResponse(res.data.AiRes);
    setStep((prev) => [...prev, ...parsedStep.map(s => ({ ...s, id: stepIdRef.current++ }))]);

  }


  return (
    <div className="w-screen h-screen bg-[#0f0f12] text-zinc-200 flex flex-col">

      {/* Top Bar */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#121216]">
        {/* Left */}
        <span className="text-sm text-zinc-400">
          bolt.new / workspace
        </span>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* File path */}
          <span className="text-xs text-zinc-500 truncate max-w-[240px]">
            {selectedFile?.path ?? "No file selected"}
          </span>

          {/* Divider */}
          <div className="h-5 w-px bg-zinc-800" />

          {/* Tabs */}
          <div className="flex rounded-lg border border-zinc-800 bg-[#0f0f12] p-0.5">
            <button
              onClick={() => setActivetab("code")}
              className={`px-3 py-1 text-xs rounded-md transition-colors
          ${activeTab === "code"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              Code
            </button>

            <button
              disabled={isStreaming}
              onClick={() => setActivetab("preview")}
              className={`px-3 py-1 text-xs rounded-md transition-colors
          ${activeTab === "preview"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              Preview
            </button>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden ">


        <aside className="w-[260px] bg-[#111114] border-r border-zinc-800 overflow-auto no-scrollbar">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Steps
          </div>
          <StepsList
            steps={step}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
          <div className="absolute bottom-0 w-[260px] flex border-none">

            <textarea
              ref={followRef}

              className="w-[220px] bg-[#151518] overflow-hidden focus:outline-none resize-none rounded-md p-4 text-sm"
              placeholder="Enter followUp prompt..."
            ></textarea>

            <button onClick={handelclick} disabled={isStreaming} className="bg-[#151518] w-[40px] cursor-pointer text-center text-green-400 rounded ">send</button>

          </div>
        </aside>


        <aside className="w-[240px] bg-[#111114] border-r border-zinc-800 overflow-auto no-scrollbar">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Files
          </div>
          <FileExplorer
            files={files}
            onFileSelect={setSelectedFile}
          />
        </aside>


        <main className="flex-1 bg-[#0f0f12] p-4 overflow-hidden no-scrollbar">
          <div className="h-full rounded-xl bg-[#151518] border border-zinc-800 shadow-inner">
            {activeTab === "code" ? (
              <CodeEditor file={selectedFile} />
            ) : container ? (
              <PreviewFrame  webContainer={container} ready={done} runtimeReady={runtimeReady} />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">
                Starting environment…
              </div>
            )}

          </div>
        </main>



      </div>
    </div>
  );


}


