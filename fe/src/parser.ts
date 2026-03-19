import { StepType } from "./types/type";
import type { Step } from "./types/type";

export function parseStepsFromResponse(response?: string): Step[] {
  if (!response) return [];

  // 1. More flexible Artifact Match: Handles missing closing tags or extra spaces
  const artifactMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)(?:<\/boltArtifact>|$)/);
  if (!artifactMatch) return [];

  const xmldata = artifactMatch[1];
  const steps: Step[] = [];
  let stepId = 1;

  // Extract Title safely
  const titleMatch = response.match(/title="([^"]*)"/);
  const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';

  steps.push({
    id: stepId++,
    title: artifactTitle,
    description: '',
    type: StepType.CreateFolder,
    status: 'pending'
  });

  /**
   * 2. ROBUST ACTION REGEX
   * - Handles optional filePath (some shell commands don't have them)
   * - Handles optional closing tag (allows parsing of partial/streaming data)
   * - Non-greedy content capture
   */
  const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?\s*>([\s\S]*?)(?:<\/boltAction>|$)/g;

  let match;
  while ((match = actionRegex.exec(xmldata)) !== null) {
    const [, type, filePath, content] = match;
    
    // Skip empty matches or internal whitespace-only hallucinations
    if (!type || (!content.trim() && type === 'file')) continue;

    if (type === 'file') {
      steps.push({
        id: stepId++,
        title: `Create ${filePath || 'file'}`,
        description: '',
        type: StepType.CreateFile,
        status: 'pending',
        code: content.trim(),
        path: filePath
      });
    } else if (type === 'shell') {
      steps.push({
        id: stepId++,
        title: 'Run command',
        description: '',
        type: StepType.RunScript,
        status: 'pending',
        code: content.trim()
      });
    }
  }

  return steps;
}