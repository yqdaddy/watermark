import { schema } from "schema";
import * as PIXI from "pixi.js";
import type { TemplateFrameMeta, TemplateLogger, TemplateVideoInput } from "typings";

type PositionType = "lt" | "rt" | "lb" | "rb" | "custom";

export class Config {
  @schema.group("文字")
  @schema.string("文本", { description: "水印内容", required: true })
  text = "动态水印";

  @schema.group("样式")
  @schema.grid("样式", 0)
  @schema.rgba("文字颜色", { description: "" })
  textColor = { r: 255, g: 255, b: 255, a: 0.1 };

  @schema.group("样式")
  @schema.grid("样式", 1)
  @schema.rgba("描边颜色", { description: "" })
  strokeColor = { r: 0, g: 0, b: 0, a: 0 };

  @schema.group("样式")
  @schema.grid("样式", 2)
  @schema.rgba("背景颜色", { description: "" })
  textBackgroundColor = { r: 0, g: 0, b: 0, a: 0 };

  @schema.group("样式")
  @schema.size("背景大小", { description: "宽度 * 高度。0,0 表示刚好覆盖文字。" })
  textBackgroundSize = { width: 0, height: 0 };

  @schema.group("样式")
  @schema.number("文字大小", { description: "相对画面的文字大小" })
  size = 100;

  @schema.group("样式")
  @schema.select(
    "字体",
    {
      无衬线: "sans-serif",
      衬线: "serif",
      等宽: "monospace",
      手写: "cursive",
      装饰: "fantasy",
      系统: "system-ui",
      "高级（自定义）": "custom",
    },
    { description: "水印使用的字体" },
  )
  fontFamily = "sans-serif";

  @schema.group("样式")
  @schema.if(
    (config) =>
      String(config.fontFamily ?? "")
        .trim()
        .toLowerCase() === "custom",
  )
  @schema.string("自定义字体", {
    description: "例如 PingFang SC, Microsoft YaHei, sans-serif",
    required: true,
  })
  customFontFamily = "";

  @schema.group("运动")
  @schema.number("文字速度", {
    description: "每秒移动距离（按画面短边像素百分比）",
    required: true,
  })
  speedPercent = 6;

  @schema.group("位置")
  @schema.select(
    "起始位置",
    { 左上: "lt", 右上: "rt", 左下: "lb", 右下: "rb", 自定义: "custom" },
    { description: "水印移动时初始的位置" },
  )
  startPosition: "lt" | "rt" | "lb" | "rb" | "custom" = "rb";

  @schema.group("位置")
  @schema.group("自定义位置")
  @schema.if((config) => config.startPosition === "custom")
  @schema.coord("坐标", { description: "自定义起点坐标（像素，按文字中心）", required: true })
  customStartCoord = { x: 0, y: 0 };
}

function clamp(value: number, min: number, max: number) {
  if (max <= min) {
    return (min + max) / 2;
  }
  return Math.max(min, Math.min(max, value));
}

function clampByte(value: unknown, fallback = 255) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(255, Math.round(numeric)));
}

function clampAlpha(value: unknown, fallback = 1) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
}

function normalizeRgba(value: unknown, fallback: { r: number; g: number; b: number; a: number }) {
  const source = value as Record<string, unknown> | null | undefined;
  return {
    r: clampByte(source?.r, fallback.r),
    g: clampByte(source?.g, fallback.g),
    b: clampByte(source?.b, fallback.b),
    a: clampAlpha(source?.a, fallback.a),
  };
}

function rgbaToNumber(color: { r: number; g: number; b: number }) {
  return (clampByte(color.r) << 16) | (clampByte(color.g) << 8) | clampByte(color.b);
}

function normalizeSizeValue(value: unknown) {
  const source = value as Record<string, unknown> | null | undefined;
  const width = Number(source?.width ?? 0);
  const height = Number(source?.height ?? 0);
  return {
    width: Number.isFinite(width) ? Math.max(0, width) : 0,
    height: Number.isFinite(height) ? Math.max(0, height) : 0,
  };
}

function normalizeText(value: unknown, fallback = "动态水印") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function normalizeCoord(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
}

function normalizeFontFamily(value: unknown) {
  const normalized = String(value ?? "sans-serif")
    .trim()
    .toLowerCase();
  switch (normalized) {
    case "serif":
      return "serif";
    case "monospace":
      return "monospace";
    case "cursive":
      return "cursive";
    case "fantasy":
      return "fantasy";
    case "system-ui":
      return "system-ui";
    case "sans-serif":
    default:
      return "sans-serif";
  }
}

function resolveFontFamily(config: Config) {
  if (
    String(config.fontFamily ?? "")
      .trim()
      .toLowerCase() === "custom"
  ) {
    const custom = String(config.customFontFamily ?? "").trim();
    if (custom.length > 0) {
      return custom;
    }
  }
  return normalizeFontFamily(config.fontFamily);
}

function normalizeSpeedPercent(value: unknown, fallback = 6) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
}

function randomVelocity(speedPixelsPerSecond: number) {
  if (speedPixelsPerSecond <= 0) {
    return { x: 0, y: 0 };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * speedPixelsPerSecond;
    const y = Math.sin(angle) * speedPixelsPerSecond;
    if (Math.abs(x) >= speedPixelsPerSecond * 0.12 && Math.abs(y) >= speedPixelsPerSecond * 0.12) {
      return { x, y };
    }
  }

  const fallback = speedPixelsPerSecond / Math.sqrt(2);
  return { x: fallback, y: fallback };
}

function resolveStartPosition(options: {
  position: PositionType;
  customX: number;
  customY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}) {
  const centerX = (options.minX + options.maxX) / 2;
  const centerY = (options.minY + options.maxY) / 2;

  if (options.position === "custom") {
    return {
      x: clamp(options.customX, options.minX, options.maxX),
      y: clamp(options.customY, options.minY, options.maxY),
    };
  }

  switch (options.position) {
    case "lt":
      return { x: options.minX, y: options.minY };
    case "rt":
      return { x: options.maxX, y: options.minY };
    case "lb":
      return { x: options.minX, y: options.maxY };
    case "rb":
      return { x: options.maxX, y: options.maxY };
    default:
      return { x: centerX, y: centerY };
  }
}

export default async function App(
  config: Config,
  imageOrVideo: TemplateVideoInput,
  logger: TemplateLogger,
) {
  logger.info("动态水印模板启动", config, Boolean(PIXI.Application));

  const [width, height] = imageOrVideo.resolution;
  const baselineScale = Math.sqrt((Math.max(width, 1) * Math.max(height, 1)) / (1920 * 1080));
  const baseSize = Number(config.size ?? 100);
  const size = Math.max(14, Math.round(baseSize * baselineScale));
  const textColor = normalizeRgba(config.textColor, { r: 255, g: 255, b: 255, a: 0.1 });
  const strokeColor = normalizeRgba(config.strokeColor, { r: 0, g: 0, b: 0, a: 0 });
  const textBackgroundColor = normalizeRgba(config.textBackgroundColor, { r: 0, g: 0, b: 0, a: 0 });
  const textBackgroundSize = normalizeSizeValue(config.textBackgroundSize);
  const text = normalizeText(config.text, "动态水印");
  const fontFamily = resolveFontFamily(config);
  const speedPercent = normalizeSpeedPercent(config.speedPercent, 6);
  const speedPixelsPerSecond = (Math.max(1, Math.min(width, height)) * speedPercent) / 100;
  const position = config.startPosition;
  const customCoord = config.customStartCoord as { x?: unknown; y?: unknown } | undefined;
  const customX = normalizeCoord(customCoord?.x, 0);
  const customY = normalizeCoord(customCoord?.y, 0);

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

  const watermarkLayer = new PIXI.Container();
  const strokeThickness = Math.max(0, Math.round(size * 0.06 * strokeColor.a));
  const watermarkText = new PIXI.Text({
    text,
    style: new PIXI.TextStyle({
      fill: rgbaToNumber(textColor),
      fontSize: size,
      fontWeight: "700",
      fontFamily,
      stroke: {
        color: rgbaToNumber(strokeColor),
        width: strokeThickness,
      },
    }),
  });
  watermarkText.alpha = textColor.a;
  watermarkText.anchor.set(0.5, 0.5);

  const extraWidth = Math.max(0, textBackgroundSize.width) * baselineScale;
  const extraHeight = Math.max(0, textBackgroundSize.height) * baselineScale;
  const backgroundWidth = Math.max(1, watermarkText.width + extraWidth);
  const backgroundHeight = Math.max(1, watermarkText.height + extraHeight);

  if (textBackgroundColor.a > 0) {
    const background = new PIXI.Sprite(PIXI.Texture.WHITE);
    background.anchor.set(0.5, 0.5);
    background.tint = rgbaToNumber(textBackgroundColor);
    background.alpha = textBackgroundColor.a;
    background.width = backgroundWidth;
    background.height = backgroundHeight;
    watermarkLayer.addChild(background);
  }

  watermarkLayer.addChild(watermarkText);
  stage.addChild(watermarkLayer);

  const padX = Math.max(16, Math.round(width * 0.02));
  const padY = Math.max(16, Math.round(height * 0.02));

  const halfWidth = Math.max(1, backgroundWidth / 2);
  const halfHeight = Math.max(1, backgroundHeight / 2);

  const minX = Math.min(width / 2, halfWidth + padX);
  const maxX = Math.max(width / 2, width - halfWidth - padX);
  const minY = Math.min(height / 2, halfHeight + padY);
  const maxY = Math.max(height / 2, height - halfHeight - padY);

  const start = resolveStartPosition({
    position,
    customX,
    customY,
    minX,
    maxX,
    minY,
    maxY,
  });

  let watermarkX = start.x;
  let watermarkY = start.y;
  let { x: velocityX, y: velocityY } = randomVelocity(speedPixelsPerSecond);

  if (minX >= maxX) velocityX = 0;
  if (minY >= maxY) velocityY = 0;

  watermarkLayer.position.set(watermarkX, watermarkY);

  const videoTexture = PIXI.Texture.from(imageOrVideo.source);
  frameSprite.texture = videoTexture;
  let previousTimeMs: number | null = null;

  try {
    imageOrVideo.onFrame((meta: TemplateFrameMeta) => {
      const currentTimeMs = Math.max(0, meta.currentTime ?? 0);
      let deltaSeconds = 1 / Math.max(1, imageOrVideo.framerate || 30);
      if (previousTimeMs !== null) {
        deltaSeconds = Math.max(0, (currentTimeMs - previousTimeMs) / 1000);
      }
      previousTimeMs = currentTimeMs;

      if (speedPixelsPerSecond > 0) {
        let nextX = watermarkX + velocityX * deltaSeconds;
        let nextY = watermarkY + velocityY * deltaSeconds;

        if (nextX <= minX) {
          nextX = minX;
          velocityX = Math.abs(velocityX);
        } else if (nextX >= maxX) {
          nextX = maxX;
          velocityX = -Math.abs(velocityX);
        }

        if (nextY <= minY) {
          nextY = minY;
          velocityY = Math.abs(velocityY);
        } else if (nextY >= maxY) {
          nextY = maxY;
          velocityY = -Math.abs(velocityY);
        }

        watermarkX = nextX;
        watermarkY = nextY;
      }

      watermarkLayer.position.set(watermarkX, watermarkY);

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
