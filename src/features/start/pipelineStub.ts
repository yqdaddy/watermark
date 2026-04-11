import JSZip from "jszip";
import type { GeneratedAsset, GenerationProgress, WatermarkTemplate } from "./types";
import type { TemplateWorkspaceFiles } from "../../template/runtime/compiler";
import { runTemplateWithWorkspace, type RuntimeLogger } from "../../template/runtime/sharedTemplateRunner";
import type { RuntimeResult } from "../../template/runtime/templateWorkerSession";

export interface GenerationPayload {
  files: File[];
  template: WatermarkTemplate;
  params: Record<string, unknown>;
  templateWorkspaceFiles?: TemplateWorkspaceFiles;
}

export interface RuntimeExecutionPayload {
  files: TemplateWorkspaceFiles;
  config?: Record<string, unknown>;
  mediaFile?: File;
  maxDurationMilliseconds?: number;
  logger: RuntimeLogger;
}

export type RuntimeExecutionRunner = (payload: RuntimeExecutionPayload) => Promise<RuntimeResult>;

export function formatPipelineProgressMessage(options: {
  fileName: string;
  isVideo: boolean;
  filePercent: number;
  overallPercent: number;
}) {
  const normalizedFilePercent = Math.max(0, Math.min(100, Math.round(options.filePercent)));
  const normalizedOverallPercent = Math.max(0, Math.min(100, Math.round(options.overallPercent)));
  const phase = options.isVideo ? "帧处理中" : "处理中";
  return `总进度 ${normalizedOverallPercent}% | ${phase} ${options.fileName} (${normalizedFilePercent}%)`;
}

function isImage(file: File) {
  return file.type.startsWith("image/");
}

function mimeTypeToExtension(mimeType: string) {
  const normalizedMime = mimeType.split(";")[0]?.trim().toLowerCase() || "";
  switch (normalizedMime) {
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/png":
    default:
      return "png";
  }
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function buildAssetName(file: File, blob: Blob, index: number) {
  const baseName = stripExtension(file.name || `asset-${index + 1}`);
  const fileType = (file.type || "").toLowerCase();
  const blobType = (blob.type || "").toLowerCase();
  const extension = fileType.startsWith("video/")
    ? mimeTypeToExtension(blobType || "video/mp4")
    : mimeTypeToExtension(blobType || fileType || "image/png");
  return `${index + 1}-${baseName}.${extension}`;
}

export async function simulateGenerate(
  payload: GenerationPayload,
  onProgress: (progress: GenerationProgress) => void,
  runtimeRunner?: RuntimeExecutionRunner,
): Promise<GeneratedAsset[]> {
  const { files, template, params, templateWorkspaceFiles } = payload;
  const runtimeLogs: unknown[] = [];

  if (!templateWorkspaceFiles) {
    return files.map((file, index) => {
      const report = {
        source: file.name,
        template: template.name,
        params,
        runtimeLogs,
        note: "",
      };
      return {
        name: `${index + 1}-${file.name}.json`,
        blob: new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
      };
    });
  }

  onProgress({ percentage: 0, message: `正在预编译模板 ${template.name}` });
  type TaskProgressState = {
    fileName: string;
    isVideo: boolean;
    start: number;
    span: number;
  };

  function buildTaskMessage(task: TaskProgressState, filePercent: number, overallPercent: number) {
    return formatPipelineProgressMessage({
      fileName: task.fileName,
      isVideo: task.isVideo,
      filePercent,
      overallPercent,
    });
  }
  let currentTask: TaskProgressState | null = null;
  const generatedAssets: GeneratedAsset[] = [];
  const total = files.length;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const taskStart = Math.round((index / Math.max(total, 1)) * 100);
    const taskEnd =
      index === total - 1 ? 100 : Math.round(((index + 1) / Math.max(total, 1)) * 100);
    currentTask = {
      fileName: file.name,
      isVideo: !isImage(file),
      start: taskStart,
      span: Math.max(1, taskEnd - taskStart),
    };
    onProgress({
      percentage: taskStart,
      message: buildTaskMessage(currentTask, 0, taskStart),
    });

    const runtimeLogger: RuntimeLogger = {
      info: (...args: unknown[]) => {
        runtimeLogs.push({ level: "info", args });
      },
      error: (...args: unknown[]) => {
        runtimeLogs.push({ level: "error", args });
      },
      progress: (percent: number) => {
        if (!currentTask) return;
        const normalizedPercent = Math.max(0, Math.min(100, Math.round(percent)));
        const scaled = currentTask.start + (currentTask.span * normalizedPercent) / 100;
        const overall = Math.max(
          currentTask.start,
          Math.min(currentTask.start + currentTask.span, Math.round(scaled)),
        );
        onProgress({
          percentage: overall,
          message: buildTaskMessage(currentTask, normalizedPercent, overall),
        });
      },
    };

    const runtimeResult = runtimeRunner
      ? await runtimeRunner({
          files: templateWorkspaceFiles,
          config: params,
          mediaFile: file,
          logger: runtimeLogger,
        })
      : await runTemplateWithWorkspace({
          files: templateWorkspaceFiles,
          config: params,
          mediaFile: file,
          logger: runtimeLogger,
          logPrefix: "template-main-thread",
        });
    if (!runtimeResult.ok) {
      throw new Error(runtimeResult.error ?? "模板运行失败");
    }

    const blob =
      runtimeResult.value instanceof Blob
        ? runtimeResult.value
        : new Blob([], { type: file.type || "image/png" });
    generatedAssets.push({
      name: buildAssetName(file, blob, index),
      blob,
    });
    onProgress({
      percentage: currentTask.start + currentTask.span,
      message: buildTaskMessage(currentTask, 100, currentTask.start + currentTask.span),
    });
    currentTask = null;
  }

  onProgress({ percentage: 100, message: `模板 ${template.name} 处理完成` });
  return generatedAssets;
}

export async function exportAsZip(assets: GeneratedAsset[]): Promise<Blob> {
  const zip = new JSZip();
  for (const asset of assets) {
    zip.file(asset.name, asset.blob);
  }
  return zip.generateAsync({ type: "blob" });
}
