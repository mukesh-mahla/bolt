import { StepType } from "./types/type";
import type { Step } from "./types/type";


export function parseStepsFromResponse(response?: string): Step[] {     
    if(!response){  
        return [];
    } 

    const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/)

    if(!xmlMatch){
        return [];
    }

    const xmldata = xmlMatch[1];
    const steps: Step[] = [];
    let stepId = 1;

    const titleMatch = xmldata.match(/title="([^"]*)"/)
     const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';

         steps.push({
                 id: stepId++,
                 title: artifactTitle,
                 description: '',
                 type: StepType.CreateFolder,
                 status: 'pending'
           });


           const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
           
           let match;
           while ((match = actionRegex.exec(xmldata)) !== null) {
             const [, type, filePath, content] = match;
         
             if (type === 'file') {
               // File creation step
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
               // Shell command step
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
    