import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(classifierPrompt);
    const intent = result.response.text().toLowerCase();

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

type GeminiMessage = {
  role: "user" | "model";
  parts: [{ text: string }];
};

function toGeminiHistory(
  messages: { role: "user" | "model"; content: string }[]
): GeminiMessage[] {
  return messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
}

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
    // Separate the last user message from history
    const history: { role: "user" | "model"; content: string }[] = message.slice(0, -1);
    const lastMessage = message[message.length - 1];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: getSystemPrompt(),
    });

    const chat = model.startChat({
      history: toGeminiHistory(history),
      generationConfig: {
        maxOutputTokens: 8192,
      },
    });

    const regex = /<boltAction[\s\S]*?<\/boltAction>/g;

    async function getCompletion(userMessage: string, attemptHistory: GeminiMessage[]): Promise<string> {
      // Rebuild chat with current history for continuation attempts
      const currentChat = model.startChat({
        history: attemptHistory,
        generationConfig: {
          maxOutputTokens: 8192,
        },
      });

      const stream = await currentChat.sendMessageStream(userMessage);

      let chunkContent = "";
      let finishReason = "";

      for await (const chunk of stream.stream) {
        const token = chunk.text();
        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason) {
          finishReason = candidate.finishReason;
        }

        if (token) {
          chunkContent += token;
          res.write(token);
        }
      }

      const isComplete =
        regex.test(chunkContent) || finishReason === "STOP";

      if (!isComplete && finishReason === "MAX_TOKENS") {
        console.log("Code incomplete, requesting continuation...");

        // Append the partial exchange to history and continue
        const updatedHistory: GeminiMessage[] = [
          ...attemptHistory,
          { role: "user", parts: [{ text: userMessage }] },
          { role: "model", parts: [{ text: chunkContent }] },
        ];

        return await getCompletion(
          "The code was cut off. Please continue exactly where you left off to finish the boltAction block.",
          updatedHistory
        );
      }

      return chunkContent;
    }

    await getCompletion(lastMessage.content, toGeminiHistory(history));
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