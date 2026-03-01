import type { Step } from "./types/type";
import { StepType } from "./types/type";

type StreamParseResult = {
  newSteps: Step[];
  remainingBuffer: string;
};

export function parseStepsFromStream(buffer: string): StreamParseResult {
  const steps: Step[] = [];

  const actionRegex =
    /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;

  let match;
  let lastConsumedIndex = 0;

  while ((match = actionRegex.exec(buffer)) !== null) {
    const [, type, filePath, content] = match;

    if (type === "file") {
      steps.push({
        id: 0, // assigned by caller
        title: `Create ${filePath || "file"}`,
        description: "",
        type: StepType.CreateFile,
        status: "pending",
        path: filePath,
        code: content.trim()
      });
    }

    if (type === "shell") {
      steps.push({
        id: 0,
        title: "Run command",
        description: "",
        type: StepType.RunScript,
        status: "pending",
        code: content.trim()
      });
    }

    lastConsumedIndex = actionRegex.lastIndex;
  }

  return {
    newSteps: steps,
    remainingBuffer: buffer.slice(lastConsumedIndex)
  };
}
