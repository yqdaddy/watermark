import type { FrameMeta, VideoInput, VideoOutput } from "../../media/interfaces";

export type TemplateFrame = OffscreenCanvas;

export type TemplateOutputFrame = TemplateFrame;

export type TemplateVideoInput = VideoInput<TemplateFrame>;

export type TemplateVideoOutput = VideoOutput;

export type TemplateFrameMeta = FrameMeta;

export interface TemplateLogger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  progress?: (percent: number) => void;
}
