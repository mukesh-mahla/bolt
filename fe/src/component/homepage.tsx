import axios from "axios";
import  {ChevronsRight, PlusIcon} from "lucide-react"
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  console.log("re render hapeen because of text")
  const redirect = useNavigate();
  console.log("send template")
     const textref = useRef<HTMLTextAreaElement>("" as any);
  
async function sendPrompt(){
console.log("send prompt clicked")
const textvalue = textref.current?.value ?? "";
 const response = await axios.post("http://localhost:4000/template",{
    Text: textvalue
  })

  const prompt = response.data.prompt
  const beautyPrompt = response.data.beautyPrompt
  console.log(beautyPrompt, prompt)
  console.log("got prompt")

  localStorage.setItem("prompt",prompt)
  localStorage.setItem("beautyPrompt",beautyPrompt)
  localStorage.setItem("userPrompt",textvalue)

  
  redirect("/project")
}

  return (
    <div className="bg-black h-screen w-screen bg-gradient-to-b from-purple-500 via-indigo-500 to-blue-500  flex items-center justify-center">
     <div className="p-4 bg-purple-500 text-black text-xl fixed  top-0 left-0 font-serif ">
      <p>Bolt.new</p>
     </div> 
      
      <div className="relative w-full gap-0 max-w-md">
        <div className="text-4xl font-serif mb-10 text-center ">what is in your mind today</div>
        <textarea
        ref={textref}
        placeholder="Type something..."
          className="p-4  w-full border border-fuchsia-300 resize-none  h-30  rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400 bg-white"
        />
        <div className="bg-white border-none flex items-center justify-between rounded-xl p-2 text-right text-xl"><PlusIcon className="inline"/><button className="cursor-pointer p-2 rounded-md" onClick={sendPrompt}>Build Now <ChevronsRight className="inline-block" /></button></div>
      </div>
    </div>
  );
}


