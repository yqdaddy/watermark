import type { WatermarkTemplate } from "./types";

export const builtInTemplates: WatermarkTemplate[] = [
  {
    id: "basic",
    name: "基本水印",
    mediaType: "both",
    builtInWorkspaceId: "basic",
    fields: [],
  },
  {
    id: "dynamic",
    name: "动态水印（仅限视频）",
    mediaType: "video",
    builtInWorkspaceId: "dynamic",
    fields: [],
  },
];
