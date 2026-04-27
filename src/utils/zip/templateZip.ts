import JSZip from "jszip";
import type { SavedParamTemplate } from "../../features/start/savedParamTemplates/types";

export type TemplateFiles = Record<string, string>;

export interface SavedParamTemplateImport {
  type: "saved-param-template";
  savedTemplate: SavedParamTemplate;
  workspaceFiles: TemplateFiles;
}

export const defaultTemplateFiles: TemplateFiles = {
  "index.ts": `import { schema } from "schema";
import * as PIXI from "pixi.js";
import type { TemplateFrameMeta, TemplateLogger, TemplateVideoInput } from "typings";

export class Config {
  @schema.string("Text", { description: "默认会显示的 placeholder (也即参数说明)" })
  text = "水印";

  @schema.string("Subtitle", { description: "可选副标题" })
  subtitle = "";

  @schema.number("Opacity", { description: "0 到 1 之间，数值越小越透明" })
  opacity = 0.65;

  @schema.number("Font Size", { description: "像素单位字体大小" })
  size = 100;

  @schema.select("Position", { 左上: "lt", 右上: "rt", 左下: "lb", 右下: "rb" }, { description: "水印位置" })
  position: "lt" | "rt" | "lb" | "rb" = "rb";
}

function clampOpacity(value, fallback = 0.65) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function normalizeText(value, fallback = "水印") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

export default async function App(config: Config, imageOrVideo: TemplateVideoInput, logger: TemplateLogger) {
  logger.info("template running", config, Boolean(PIXI.Application));

  const [width, height] = imageOrVideo.resolution;
  const size = Math.max(14, Math.round(Number(config.size ?? 100)));
  const opacity = clampOpacity(config.opacity, 0.65);
  const text = normalizeText(config.text, "水印");
  const subtitle = normalizeText(config.subtitle, "");
  const position = config.position;

  const output = imageOrVideo.output();
  const canvas = output.source;
  const app = new PIXI.Application();
  await app.init({
    canvas,
    width,
    height,
    antialias: true,
    backgroundAlpha: 0,
    clearBeforeRender: true,
  });

  const stage = new PIXI.Container();
  const frameSprite = new PIXI.Sprite();
  frameSprite.width = width;
  frameSprite.height = height;
  stage.addChild(frameSprite);

  const padX = Math.max(16, Math.round(width * 0.02));
  const padY = Math.max(16, Math.round(height * 0.02));
  const gap = Math.max(8, Math.round(size * 0.18));
  const subtitleSize = Math.max(12, Math.round(size * 0.42));
  const isRight = position.endsWith("r");
  const isTop = position.startsWith("t");
  const baseX = isRight ? width - padX : padX;
  const baseY = isTop ? padY : height - padY;

  const mainText = new PIXI.Text({
    text,
    style: new PIXI.TextStyle({
      fill: 0xffffff,
      fontSize: size,
      fontWeight: "700",
      fontFamily: "system-ui,sans-serif",
    }),
  });
  mainText.alpha = opacity;
  mainText.anchor.set(isRight ? 1 : 0, isTop ? 0 : 1);
  mainText.position.set(baseX, baseY);
  stage.addChild(mainText);

  const subText = new PIXI.Text({
    text: subtitle,
    style: new PIXI.TextStyle({
      fill: 0xffffff,
      fontSize: subtitleSize,
      fontWeight: "500",
      fontFamily: "system-ui,sans-serif",
    }),
  });
  subText.visible = subtitle.length > 0;
  subText.alpha = opacity;
  subText.anchor.set(isRight ? 1 : 0, isTop ? 0 : 1);
  subText.position.set(baseX, isTop ? baseY + size + gap : baseY - size - gap);
  stage.addChild(subText);

  const videoTexture = PIXI.Texture.from(imageOrVideo.source);
  frameSprite.texture = videoTexture;

  try {
    imageOrVideo.onFrame(() => {

      videoTexture.source.update();
      app.renderer.render(stage);

      logger.progress?.(100);

      output.push();
    });
    await imageOrVideo.start();
    return await output.finish();
  } finally {
    videoTexture.destroy(true);
    app.destroy(false);
  }
}
`,
};

export async function importTemplateZip(
  file: File,
): Promise<TemplateFiles | SavedParamTemplateImport> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files).filter(([, zipFile]) => !zipFile.dir);
  const files: TemplateFiles = {};

  for (const [name, zipFile] of entries) {
    files[name] = await zipFile.async("string");
  }

  // 检查是否有 config.json（用户模版导出格式）
  if (files["config.json"]) {
    try {
      const configData = JSON.parse(files["config.json"]);
      const savedTemplate: SavedParamTemplate = {
        id: `saved-${Date.now()}`,
        name: configData.name,
        sourceTemplateId: configData.sourceTemplateId,
        sourceTemplateName: configData.sourceTemplateName || configData.sourceTemplateId,
        params: configData.params,
        normalizedParams: configData.normalizedParams,
        createdAt: configData.createdAt || Date.now(),
        updatedAt: Date.now(),
        mediaType: configData.mediaType || "both",
      };

      // 移除 config.json，保留 workspace 文件
      const workspaceFiles: TemplateFiles = {};
      for (const [name, content] of Object.entries(files)) {
        if (name !== "config.json") {
          workspaceFiles[name] = content;
        }
      }

      if (!workspaceFiles["index.ts"]) {
        workspaceFiles["index.ts"] = defaultTemplateFiles["index.ts"];
      }

      return {
        type: "saved-param-template",
        savedTemplate,
        workspaceFiles,
      };
    } catch (error) {
      console.error("Failed to parse config.json:", error);
      // 解析失败，按普通模版处理
    }
  }

  // 普通模版逻辑
  if (!files["index.ts"]) files["index.ts"] = defaultTemplateFiles["index.ts"];
  return files;
}

export async function exportTemplateZip(files: TemplateFiles): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: "blob" });
}

/**
 * 导出已保存的参数模版为 zip
 *
 * 包含来源模版的 workspace 文件 + config.json（参数配置）
 */
export async function exportSavedParamTemplateZip(
  saved: SavedParamTemplate,
  workspaceFiles: TemplateFiles,
): Promise<Blob> {
  const zip = new JSZip();

  // 添加 workspace 文件
  for (const [name, content] of Object.entries(workspaceFiles)) {
    zip.file(name, content);
  }

  // 添加 config.json
  const configFile = {
    name: saved.name,
    sourceTemplateId: saved.sourceTemplateId,
    sourceTemplateName: saved.sourceTemplateName,
    params: saved.params,
    normalizedParams: saved.normalizedParams,
    createdAt: saved.createdAt,
    mediaType: saved.mediaType,
  };
  zip.file("config.json", JSON.stringify(configFile, null, 2));

  return zip.generateAsync({ type: "blob" });
}
