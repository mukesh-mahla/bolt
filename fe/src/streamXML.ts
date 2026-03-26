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
    const [fullMatch, type, filePath, content] = match;
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;

    if (type === "file") {
      steps.push({
        id: 0,
        title: `Create ${filePath || "file"}`,
        description: "",
        type: StepType.CreateFile,
        status: "pending",
        path: filePath,
        code: content.trim(),
      });
    }

    if (type === "shell") {
      steps.push({
        id: 0,
        title: "Run command",
        description: "",
        type: StepType.RunScript,
        status: "pending",
        code: content.trim(),
      });
    }

    lastConsumedIndex = matchEnd;
  }

  // Check if there's an incomplete opening tag in the remainder —
  // keep it buffered so the next chunk can complete it.
  const remainder = buffer.slice(lastConsumedIndex);
  const incompleteTagIndex = remainder.search(/<boltAction[\s\S]*/);

  return {
    newSteps: steps,
    // If an incomplete tag exists, buffer from that point onward.
    // Otherwise discard non-action text (prose/thinking blocks).
    remainingBuffer: incompleteTagIndex !== -1
      ? remainder.slice(incompleteTagIndex)
      : "",
  };
}