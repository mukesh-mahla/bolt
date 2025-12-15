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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


router.post("/template", async (req, res) => {
  const { Text } = req.body;
  if (!Text) return res.status(400).json({ error: "Text missing" });

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const classifierPrompt = `
Classify the user's intent.

Return ONLY ONE WORD:
- react → frontend, UI, components, pages, calculator, todo, website
- node → backend, api, server, database, auth, express

If the request is ambiguous, ALWAYS return react.

User request:
${Text}
`;

  const result = await model.generateContent(classifierPrompt);
  const intent = result.response.text().toLowerCase().trim();

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
  const { beautyPrompt, prompt, userPrompt } = req.body;
  if (!userPrompt) {
    return res.status(400).json({ error: "userPrompt missing" });
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  // ✅ Gemini requires FIRST message to be "user"
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [
          {
            text: `
${getSystemPrompt()}

${beautyPrompt}

${prompt}
            `,
          },
        ],
      },
    ],
  });

  const response = await chat.sendMessage(userPrompt);

  res.json({
    AiRes: response.response.text(),
  });
});



app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
