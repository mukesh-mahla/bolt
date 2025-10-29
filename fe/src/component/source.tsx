import { useEffect, useState } from "react"
import axios from "axios"

import { parseStepsFromResponse } from "../parser"
import type { Step } from "../types/type"
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
    const [data, setData] = useState("")
    const [step,setStep] = useState<Step[]>([])

    useEffect(()=>{

       fetchData().then(res => {
           setData(res)
       })
      const step:Step[] =  parseStepsFromResponse(data)
      setStep(step)
       
    },[textvalue])
       
    console.log("data",data)

    return <div className="w-screen flex h-screen bg-black text-white">
        <div className="w-screen h-screen text-yellow-500">
            {step.map(x => <p>`${x}`</p>)}
        </div>
         
    </div>
}

function Steps(){
    return <div className="w-screen flex h-screen bg-black text-white">
        Steps Component 
    </div>
}
