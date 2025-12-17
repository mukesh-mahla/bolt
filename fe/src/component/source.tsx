import {  useEffect, useRef, useState } from "react"
import axios from "axios"

import { parseStepsFromResponse } from "../parser"
import {  StepType, type FileItem, type Step } from "../types/type"
import { StepsList } from "../componets/steplist"
import { CodeEditor } from "../componets/codeEditor"
import { FileExplorer } from "../componets/fileExplorer"
import { useWebcontainer } from "../hooks/useWebcontainer"

import { PreviewFrame } from "../componets/previewFrame"
import { useLocation } from "react-router-dom"


// const prompt = localStorage.getItem("prompt") || "" 
// const beautyPrompt = localStorage.getItem("beautyPrompt") || ""
// const textvalue = localStorage.getItem("userPrompt") || ""  
// console.log("PROMPT:", textvalue)


export  default function Source(){
    // const [data, setData] = useState("")
    const [step,setStep] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState<number>(-1);
      const [files, setFiles] = useState<FileItem[]>([]);
      const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
      // const [FollowPrompt, setFollowPrompt] = useState("");
      const [llmMessages, setLlmMessages] = useState<{role: "user" | "model", content: string;}[]>([]);

      const followRef = useRef<HTMLTextAreaElement | null>(null);
      const location = useLocation();

      const [activeTab,setActivetab] = useState<"code" | "preview">("code")

      const { prompt, beautyPrompt, userPrompt } = location.state as { prompt: string, beautyPrompt: string, userPrompt: string };

      const webContainer = useWebcontainer()


      
const fetchData = async () => {
  const newMessages:{role: "user" | "model", content: string;}[] = [

  { role: "user", content: `${beautyPrompt} ${prompt} ${userPrompt}` }
];

         setLlmMessages(newMessages);
            const ressp = await axios.post("http://localhost:4000/chat",{
               message: newMessages
            })

    

      setLlmMessages([...newMessages,{role:"model", content: ressp.data.AiRes}])
            return ressp.data.AiRes
        }

    

    useEffect(()=>{
        fetchData().then(res => {
            // setData(res)
            const parsedStep:Step[] =  parseStepsFromResponse(res)
            setStep(parsedStep)


           if (parsedStep.length > 0) setCurrentStep(parsedStep[0].id);
       })
    },[])

       useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    step.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; 
        let finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
                

          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }

    })

    if (updateHappened) {

      setFiles(originalFiles)
      setStep(steps => steps.map((s: Step) => {
        return {
          ...s,
          status: "completed"
        }
        
      }))
    }
    
  }, [step]);

   
   useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          // For folders, create a directory entry
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
  
      // Process each top-level file/folder
      files.forEach(file => processFile(file, true));
  
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
    // Mount the structure if WebContainer is available
    console.log(mountStructure);
    webContainer?.mount(mountStructure);
  }, [files, webContainer]);

    function handleStepClick(stepId: number) {
    setCurrentStep(stepId);
    
  } 
 async function handelclick(){
 
   const followValue = followRef.current?.value?.trim();
  if (!followValue) return;

  const MAX_MESSAGES = 10;

  const newMessages:{role:"user" | "model", content: string}[] = [
    ...llmMessages,
    { role: "user", content: followValue }
  ];

  const trimmedMessages:{role:"user" | "model", content: string}[] =
    newMessages.length > MAX_MESSAGES
      ? newMessages.slice(-MAX_MESSAGES)
      : newMessages;

  setLlmMessages(trimmedMessages);
  followRef.current!.value = "";

  const res = await axios.post("http://localhost:4000/chat", {
    message: trimmedMessages
  });

  setLlmMessages(prev => [
    ...prev,
    { role: "model", content: res.data.AiRes }
  ]);

  const parsedStep = parseStepsFromResponse(res.data.AiRes);
  setStep(parsedStep);

  }


    return  (
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

          <button onClick={handelclick} className="bg-[#151518] w-[40px] cursor-pointer text-center text-green-400 rounded ">send</button>
          
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
          {activeTab === "code" ? (<CodeEditor file={selectedFile} />) : (<PreviewFrame webContainer={webContainer!} files={files} />)}
         
        </div>
      </main>



    </div>
  </div>
);


}


