import { useEffect, useState } from "react"
import axios from "axios"
console.log("source file loaded")
import { parseStepsFromResponse } from "../parser"
import {  StepType, type FileItem, type Step } from "../types/type"
import { StepsList } from "../componets/steplist"
import { CodeEditor } from "../componets/codeEditor"
import { FileExplorer } from "../componets/fileExplorer"


const prompt = localStorage.getItem("prompt") || "" 
const beautyPrompt = localStorage.getItem("beautyPrompt") || ""
const textvalue = localStorage.getItem("userPrompt") || ""  

const fetchData = async () => {
            const ressp = await axios.post("http://localhost:4000/chat",{
                prompt,
                beautyPrompt,
                userPrompt: textvalue
            })
            console.log(ressp.data.AiRes)
    
            return ressp.data.AiRes
        }

export  default function Source(){
    // const [data, setData] = useState("")
    const [step,setStep] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState<number>(-1);
      const [files, setFiles] = useState<FileItem[]>([]);
      const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

    

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
    console.log(files);
  }, [step, files]);

    function handleStepClick(stepId: number) {
    setCurrentStep(stepId);
    
    console.log("clicked step", stepId);
  } 


    return  (
  <div className="w-screen h-screen bg-[#0f0f12] text-zinc-200 flex flex-col">

    {/* Top Bar */}
    <header className="h-11 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#121216]">
      <span className="text-sm text-zinc-400">
        bolt.new / workspace
      </span>

      <span className="text-xs text-zinc-500 truncate max-w-[50%]">
        {selectedFile?.path ?? "No file selected"}
      </span>
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
          <CodeEditor file={selectedFile} />
        </div>
      </main>

    </div>
  </div>
);


}


