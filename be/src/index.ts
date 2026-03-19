import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  firstNodeprompt,
  firstReactprompt,
  getSystemPrompt,
  nodePrompt,
  reactPrompt,
} from "./prompts.js";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use("/", router);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── /template ────────────────────────────────────────────────────────────────

router.post("/template", async (req, res) => {
  const { Text } = req.body;
  if (!Text) return res.status(400).json({ error: "Text missing" });

  const classifierPrompt = `
Classify the user's intent.

Return ONLY ONE WORD:
- react → frontend, UI, components, pages, calculator, todo, website
- node  → backend, api, server, database, auth, express

If the request is ambiguous, ALWAYS return react.

User request:
${Text}
`;

  try {

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



    // const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // const result = await model.generateContent(classifierPrompt);
    // const intent = result.response.text().toLowerCase();

    console.log("INTENT:", intent);

    if (
      intent.includes("node") ||
      intent.includes("backend") ||
      intent.includes("express")
    ) {
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
  } catch (err) {
    console.error("Template error:", err);
    return res.status(500).json({ error: "Classification failed" });
  }
});

// ─── /chat ────────────────────────────────────────────────────────────────────



type Message = {
  role: "user" | "model";
  parts: [{ text: string }];
};

function geminiContentsToGroqMessages(
  messages: { role: "user" | "model"; content: string }[]
): ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role === "model" ? "assistant" : "user",
    content: m.content,
  }));
}

// function toGeminiHistory(
//   messages: { role: "user" | "model"; content: string }[]
// ): Message[] {
//   return messages.map((m) => ({
//     role: m.role, // Gemini uses "user" | "model" natively — no conversion needed
//     parts: [{ text: m.content }],
//   }));
// }
const systemPrompt = getSystemPrompt();
const systemTokens = Math.ceil(systemPrompt.length / 4);


console.log({
  systemPromptChars: systemPrompt.length,
  systemPromptTokensApprox: systemTokens,
  
  totalInputApprox: systemTokens,
  maxOutput: 8192,
});

router.post("/chat", async (req, res) => {
  const { message } = req.body;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    let currentMessages = [
      { role: "system", content: getSystemPrompt() },
      ...geminiContentsToGroqMessages(message)
    ];

    const regex = /<boltAction[\s\S]*?<\/boltAction>/g;

    async function getCompletion(messages:any) {
      const stream = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.3-70b-versatile",
        max_completion_tokens: 4096, // Smaller chunks for faster validation
        stream: true,
      });

      let chunkContent = "";
      let finishReason = "";

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        finishReason = chunk.choices[0]?.finish_reason!;
        
        if (token) {
          chunkContent += token;
          res.write(token); // Keep the user updated
        }
      }

      // CHECK: Does the full buffered text contain a complete boltAction?
      const isComplete = regex.test(chunkContent) || finishReason === "stop";

      if (!isComplete && finishReason === "length") {
        console.log("Code incomplete, requesting continuation...");
        
        // Add the partial AI response to history
        messages.push({ role: "assistant", content: chunkContent });
        // Add a prompt to force continuation
        messages.push({ role: "user", content: "The code was cut off. Please continue exactly where you left off to finish the boltAction block." });
        
        // Recursive call
        return await getCompletion(messages);
      }
      
      return chunkContent;
    }

    await getCompletion(currentMessages);
    res.end();

  } catch (err) {
    console.error(err);
    res.end();
  }
});

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});