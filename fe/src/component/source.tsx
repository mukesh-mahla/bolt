import { useEffect, useState } from "react"
import axios from "axios"
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


export default function Source(){
    const [data, setData] = useState("")
    
    useEffect(()=>{

       fetchData().then(res => {
           setData(res)
       })

    },[textvalue])
    console.log("data",data)

    return <div className="w-screen flex h-screen bg-black text-white">
        <div>
             {data}
        </div>
          <Steps/> 
    </div>
}

function Steps(){
    return <div className="w-screen flex h-screen bg-black text-white">
        Steps Component 
    </div>
}
