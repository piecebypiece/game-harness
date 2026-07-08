import { resolveProjectPath } from "../../core/paths.js";

export function unityCliSuggestions(project: string): string[] {
  const projectRoot = resolveProjectPath(project);
  return [
    `unity-cli --project "${projectRoot}" status`,
    `unity-cli --project "${projectRoot}" console --filter error --lines 50`,
    `unity-cli --project "${projectRoot}" editor refresh --compile`
  ];
}

