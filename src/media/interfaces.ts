export interface FrameMeta {
  index: number;
  total: number;
  // Milliseconds
  currentTime: number;
  // Milliseconds
  duration: number;
  progress: number;
}

export type FrameCallback<TFrame> =
  | ((meta: FrameMeta) => void)
  | ((frame: TFrame, meta: FrameMeta) => void);

export interface VideoInput<TFrame = OffscreenCanvas> {
  readonly kind: "image" | "video";
  readonly sourceName: string;
  readonly mimeType: string;
  readonly source: OffscreenCanvas;
  onFrame(callback: FrameCallback<TFrame>): void;
  start(): Promise<void>;
  readonly framerate: number;
  readonly resolution: [number, number];
  readonly bitrate: number;
  // Milliseconds
  readonly duration: number;
  output(): VideoOutput;
}

export interface VideoOutput {
  readonly source: OffscreenCanvas;
  push(): void;
  finish(): Promise<Blob>;
  readonly framerate: number;
  readonly resolution: [number, number];
  readonly bitrate: number;
  // Milliseconds
  readonly duration: number;
}
