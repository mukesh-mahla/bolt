import { useEffect, useState } from "react"
import axios from "axios"
console.log("source file loaded")
import { parseStepsFromResponse } from "../parser"
import {  type Step } from "../types/type"
import { StepsList } from "../componets/steplist"


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

    // const [File,setFIle] = useState<FileItem[]>([])

    useEffect(()=>{
        

       fetchData().then(res => {
            // setData(res)
            const parsedStep:Step[] =  parseStepsFromResponse(res)
            setStep(parsedStep)

           if (parsedStep.length > 0) setCurrentStep(parsedStep[0].id);
       })
      

    },[])
       
    function handleStepClick(stepId: number) {
    setCurrentStep(stepId);
    // TODO: when step clicked, you can also open the file, scroll to code, or populate editor
    console.log("clicked step", stepId);
  }

    return <div className="w-screen flex h-screen bg-black text-white">
        <div className="w-screen h-screen text-yellow-500">
            
            <StepsList steps={step} currentStep={currentStep} onStepClick={handleStepClick}/>
            
        </div>
         
    </div>
}

// function Steps({step}:{step:Step[]}){
//     return <div className="w-screen flex h-screen bg-black text-green">
//         Steps Component {step.map(x => <div> ${x.code}</div>)}
//     </div>
// }
