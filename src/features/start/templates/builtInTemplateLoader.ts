import indexTsRaw from "./basic/index.ts?raw";
import dynamicIndexTsRaw from "./dynamic/index.ts?raw";

export type BuiltInTemplateWorkspace = Record<string, string>;

export async function loadBuiltInTemplateWorkspace(templateId: string): Promise<BuiltInTemplateWorkspace | null> {
  switch (templateId) {
    case "basic":
      return {
        "index.ts": indexTsRaw
      };
    case "dynamic":
      return {
        "index.ts": dynamicIndexTsRaw,
      };
    default:
      return null;
  }
}
