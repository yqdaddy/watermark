import type { TemplateWorkspaceFiles } from "./compiler";
import { runTemplateWithWorkspace, type RuntimeLogger } from "./sharedTemplateRunner";

export async function runTemplateOnMainThread(options: {
  files: TemplateWorkspaceFiles;
  config?: Record<string, unknown>;
  mediaFile?: File;
  maxDurationMilliseconds?: number;
  logger?: RuntimeLogger;
}): Promise<{ ok: boolean; value?: unknown; error?: string }> {
  return runTemplateWithWorkspace({
    ...options,
    logPrefix: "template-main-thread",
  });
}
