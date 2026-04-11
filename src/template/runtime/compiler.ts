import * as Babel from "@babel/standalone";
import {
  compileWorkspaceToSyncBundle,
  type SyncBundleResult,
  type TemplateWorkspaceFiles,
} from "./bundler";

export async function compileTemplateCode(source: string, filename = "index.ts") {
  const output = Babel.transform(source, {
    filename,
    presets: [["env", { targets: "defaults" }], "typescript", ["react", { runtime: "automatic" }]],
    plugins: [["proposal-decorators", { version: "2023-11" }]],
    sourceMaps: false,
  });

  return output.code ?? "";
}

export type { SyncBundleResult, TemplateWorkspaceFiles };

export async function compileTemplateWorkspace(
  files: TemplateWorkspaceFiles,
  entry = "index.ts",
): Promise<SyncBundleResult> {
  return compileWorkspaceToSyncBundle(files, entry);
}
