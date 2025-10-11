// import 'dotenv/config'
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// async function main() {
//   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
// const message = "make a todo app"
//   const chat = [
//     {
//         role: "user",
//         parts: [{ text: message}],
//      }
// ];

//   const strem = await model.generateContentStream(JSON.stringify(chat))

//   for await (const chunk of strem.stream){
//     const text = chunk.text()
//     if(text) process.stdout.write(text)
//   }
// }

// main();


import 'dotenv/config'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firstprompt, getSystemPrompt, nodePrompt } from './prompts.js';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function main() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const message = "make a todo app";
 
  

  // 👇 history-style format (no stringify needed)
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
        { type: "text", text: message },
      ],
    },
  ];
 console.log(chat)
  // Pass the array directly
  const stream = await model.generateContentStream(JSON.stringify(chat));
 
  

     for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) process.stdout.write(text);
  }
}
const reactPrompt =`You are working inside a Vite + React + TypeScript project that uses Tailwind CSS and Lucide React for icons.  
The project already includes configuration and boilerplate files such as:  
- index.html  
- package.json  
- vite.config.ts  
- postcss.config.js  
- tailwind.config.js  
- eslint.config.js  
- tsconfig.json and related files  
- src/main.tsx  
- src/App.tsx  
- src/index.css  

When editing or creating code, always work within this file structure.  
Place reusable UI components in src/components/ and pages or views in src/pages/.  
Do not delete or rename existing files unless explicitly instructed.  
Ensure imports use correct relative paths, and maintain valid TypeScript syntax.  
Use Tailwind classes for styling and Lucide React for icons whenever needed.  
Keep JSX clean, readable, and consistent with React conventions.`

main();


