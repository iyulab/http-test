import { Variables } from "../types";
import { logVerbose } from "./logger";
import { processDynamicVariables } from "./dynamicVariables";

export function replaceVariablesInString(
  content: string,
  variables: Variables
): string {
  // Step 1: Process dynamic variables ({{$guid}}, {{$timestamp}}, etc.)
  let processed = processDynamicVariables(content);

  // Step 2: Replace user-defined variables
  processed = processed.replace(/\{\{(.+?)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();

    // Skip if it's a dynamic variable that wasn't processed (unknown)
    if (trimmedKey.startsWith('$')) {
      return match;
    }

    const value = variables[trimmedKey];
    logVerbose(`Replacing variable: {{${trimmedKey}}} with ${value}`);
    return value !== undefined ? String(value) : `{{${trimmedKey}}}`;
  });

  return processed;
}