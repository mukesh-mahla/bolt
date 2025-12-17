import "dotenv/config";
import express from "express";
import cors from "cors";
// import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
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

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!});

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: classifierPrompt,
  });
  const intent = response.text!.toLowerCase().trim();

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
  const contents = message.map((m :{role: "user" | "model", content: string}) => ({
    role: m.role, // "user" | "model"
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents:contents,
    config:{
      systemInstruction:`${getSystemPrompt()}`
    }
  })
  //  Gemini requires FIRST message to be "user"
  
  res.json({
    AiRes: response.text,
  });
});



app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
