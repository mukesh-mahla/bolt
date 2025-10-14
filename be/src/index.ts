import 'dotenv/config'
import express, { json } from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {  firstNodeprompt, firstReactprompt, getSystemPrompt, nodePrompt, reactPrompt } from './prompts.js';
import cors from 'cors'
const app = express()
const router = express.Router()
app.use(cors())
app.use(express.json())
app.use("/",router)


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const message = "make a todo app ";


router.post('/template',async(req,res)=>{
  console.log("got request")
  const {Text} = req.body
  const message = JSON.stringify(Text)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: message }],
      },
      
    ],
  });
  console.log("connection")
 const response=  await chat.sendMessage("based on what user send tell what does it want in a single word it can be react or node.do not return anything extra")
 console.log("got response")
 console.log(response)
    if(response.response.text()=="react"){
      res.json({prompt:reactPrompt,beautyPrompt:firstReactprompt})
    }else if(response.response.text()=="Node"){
res.json({prompt:nodePrompt,beauyPrompt:firstNodeprompt})
    }
})

router.post('/chat',async(req,res)=>{
  const {beautyPrompt,prompt,userPrompt} = req.body
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: beautyPrompt }],
      },
      {
        role:"user",
        parts:[{text:prompt}]
      }
      
    ],
  });
   
   const response = await chat.sendMessage(userPrompt)
  //  const t = await chat.getHistory()
  //  for(let i =0;i<t.length;i++){
  //        console.log(t[i]?.parts)
  //      }
   
 console.log(response.response.text())
 res.json({})
})




async function main() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chat =  [
     {
     
      alias: "system",
      content: [
        { type: "text", text: getSystemPrompt },
      ],
    },
    {
      alias: "user",
      content: [
        { type: "text", text: reactPrompt },
      ],
    },
    {
      alias: "user",
      content: [
        { type: "text", text: "hello" },
      ],
    },
  ];

 
  const stream = await model.generateContentStream(JSON.stringify(chat));
     for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) process.stdout.write(text);
  }
  
}


// async function test(){
//   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//   const chat = model.startChat({
//     history: [
//       {
//         role: "user",
//         parts: [{ text: "hello" }],
//       },
      
//     ],
//   });
//  const response=  await chat.sendMessage("hi")
//  const t = await chat.getHistory()
//    for(let i =0;i<t.length;i++){
//     console.log(t[i]?.parts)
//    }
 
// }


// test()

app.listen(4000,()=>{console.log("server is runnin on 4000")})

