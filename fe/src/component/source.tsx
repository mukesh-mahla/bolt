import { useEffect, useState } from "react"
import axios from "axios"
console.log("source file loaded")
import { parseStepsFromResponse } from "../parser"
import {  StepType, type FileItem, type Step } from "../types/type"
import { StepsList } from "../componets/steplist"
import { CodeEditor } from "../componets/codeEditor"


const prompt = localStorage.getItem("prompt") || "" 
const beautyPrompt = localStorage.getItem("beautyPrompt") || ""
const textvalue = localStorage.getItem("userPrompt") || ""  

const fetchData = async () => {
            const ressp = await axios.post("http://localhost:4000/chat",{
                prompt,
                beautyPrompt,
                userPrompt: textvalue
            })
    
            return ressp.data.AiRes
        }

export  default function Source(){
    // const [data, setData] = useState("")
    const [step,setStep] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState<number>(-1);
      const [files, setFiles] = useState<FileItem[]>([]);

    // const [File,setFIle] = useState<FileItem[]>([])

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
        let currentFileStructure = [...originalFiles]; // {}
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

    return <div className="w-screen flex h-screen bg-black text-white">
        <div className="w-screen h-screen text-yellow-500">
            
            <StepsList steps={step} currentStep={currentStep} onStepClick={handleStepClick}/>
            <CodeEditor file={files}/>
        </div>
         
    </div>
}










  
// function genratedFile(step:Step[]):FileItem[]{
// const File:FileItem[] = [];
//     if(step.find(x=>x.type == StepType.CreateFile)){
//         File.push({
//             path:step.path.split('/     ')
//         })
//     }
  

//     return  File
// } 