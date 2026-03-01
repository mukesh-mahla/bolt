import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};


import {
  firstNodeprompt,
  firstReactprompt,
  getSystemPrompt,
  nodePrompt,
  reactPrompt,
} from "./prompts.js";

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use("/", router);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });



router.post("/template", async (req, res) => {
  const { Text } = req.body;
  if (!Text) return res.status(400).json({ error: "Text missing" });

  const classifierPrompt = `
Classify the user's intent.

Return ONLY ONE WORD:
- react → frontend, UI, components, pages, calculator, todo, website
- node → backend, api, server, database, auth, express

If the request is ambiguous, ALWAYS return react.

User request:
${Text}
`;

  const response = await groq.chat.completions.create({
    messages: [
      
      {
        role: "system",
        content: classifierPrompt,
      },
      
      {
        role: "user",
        content: Text,
      },
    ],
    model: "llama-3.3-70b-versatile",
  });

 const intent = response.choices[0]?.message?.content!.toLowerCase() || "";

  console.log("INTENT:", intent);


  if (intent.includes("node") || intent.includes("backend") || intent.includes("express")) {
    return res.json({
      prompt: nodePrompt,
      beautyPrompt: firstNodeprompt,
      type: "backend",
    });
  }

  return res.json({
    prompt: reactPrompt,
    beautyPrompt: firstReactprompt,
    type: "frontend",
  });
 
});


router.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message missing" });
  }

  // 🔑 Required headers for streaming
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  

function geminiContentsToGroqMessages(message: any[]): ChatCompletionMessageParam[] {

  return  message.map(
    (m: { role: "user" | "model"; content: string }) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.content,
    })
  )}

    const groqMessages: ChatCompletionMessageParam[] = [
    
   ...geminiContentsToGroqMessages(message),
  ];

  try {
    // STREAMING API
    
  const stream = await groq.chat.completions.create({
    
    messages: [{role:"system", content: getSystemPrompt()},...groqMessages],
    model: "llama-3.3-70b-versatile",
    max_completion_tokens: 2048,
    top_p: 1,
    stop: null,
    stream: true,
  });

  for await (const chunk of stream) {
    
    const token = chunk.choices[0]?.delta?.content;
      if (token) {
        res.write(token); 
      }
  }
res.end();
    }
 catch (err) {
    console.error("Streaming error:", err);
    res.end();
  } 
  }
);


const PORT = process.env.PORT 

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});






