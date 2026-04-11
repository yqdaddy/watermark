import { schema } from "schema";
import * as PIXI from "pixi.js";
import type { TemplateLogger, TemplateVideoInput } from "typings";

type PositionType = "lt" | "rt" | "lb" | "rb" | "custom";
type WatermarkKind = "text" | "image" | "fullscreen";

export class Config {
  @schema.group("基础")
  @schema.select(
    "类型",
    { 文字: "text", 图像: "image", 全屏水印: "fullscreen" },
    { description: "选择水印类型" },
  )
  kind: WatermarkKind = "text";

  @schema.group("文字")
  @schema.if((config) => config.kind === "text")
  @schema.string("内容", { description: "水印内容", required: true })
  text = "水印";

  @schema.group("文字")
  @schema.if((config) => config.kind === "text")
  @schema.string("副内容（小字）", { description: "可选副标题" })
  subtitle = "";

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.string("内容", { description: "全屏重复水印文本", required: true })
  fullScreenText = "水印";

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.number("行间距", { description: "两行水印间空开的距离", required: true })
  lineSpacing = 1.5;

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.number("旋转角度", { description: "水印的旋转角度", required: true })
  rotation = -24;

  @schema.group("图像")
  @schema.if((config) => config.kind === "image")
  @schema.image("图像", { description: "水印使用的 logo 图像", required: true })
  imageData = "";

  @schema.group("样式")
  @schema.if((config) => config.kind === "text")
  @schema.grid("样式", 0)
  @schema.rgba("文字颜色", { description: "" })
  textColor = { r: 255, g: 255, b: 255, a: 0.1 };

  @schema.group("样式")
  @schema.if((config) => config.kind === "text")
  @schema.grid("样式", 1)
  @schema.rgba("描边颜色", { description: "" })
  strokeColor = { r: 0, g: 0, b: 0, a: 0 };

  @schema.group("样式")
  @schema.if((config) => config.kind === "text")
  @schema.grid("样式", 2)
  @schema.rgba("文字背景颜色", { description: "" })
  textBackgroundColor = { r: 0, g: 0, b: 0, a: 0 };

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.grid("样式", 0)
  @schema.rgba("文字颜色", { description: "" })
  fullScreenColor = { r: 255, g: 255, b: 255, a: 0.1 };

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.grid("样式", 1)
  @schema.rgba("描边颜色", { description: "" })
  fullScreenStrokeColor = { r: 0, g: 0, b: 0, a: 0 };

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.grid("样式", 2)
  @schema.rgba("背景颜色", { description: "" })
  fullScreenBackgroundColor = { r: 0, g: 0, b: 0, a: 0 };

  @schema.group("全屏水印")
  @schema.if((config) => config.kind === "fullscreen")
  @schema.size("背景大小", { description: "宽度 * 高度。0,0 表示刚好覆盖文字。" })
  fullScreenBackgroundSize = { width: 0, height: 0 };

  @schema.group("样式")
  @schema.if((config) => config.kind === "text")
  @schema.size("文字背景大小", { description: "宽度 * 高度。0,0 表示刚好覆盖文字。" })
  textBackgroundSize = { width: 0, height: 0 };

  @schema.group("样式")
  @schema.number("Size", { description: "相对画面的文字大小" })
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

  @schema.group("位置")
  @schema.if((config) => config.kind !== "fullscreen")
  @schema.select(
    "位置",
    { 左上: "lt", 右上: "rt", 左下: "lb", 右下: "rb", 自定义: "custom" },
    { description: "水印位置" },
  )
  position: 'lt' | 'rt' | 'lb' | 'rb' | 'custom' = "rb";

  @schema.group("位置")
  @schema.group("自定义位置")
  @schema.if((config) => config.kind !== "fullscreen")
  @schema.if((config) => config.position === "custom")
  @schema.coord("坐标", { description: "自定义位置坐标（像素）", required: true })
  customCoord = { x: 0, y: 0 };
}

function clampByte(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(255, Math.round(numeric)));
}

function clampAlpha(value: unknown, fallback = 1) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
}

function normalizeRgba(
  value: unknown,
  fallback: { r: number; g: number; b: number; a: number },
) {
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

function normalizeText(value: unknown, fallback = "水印") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function normalizeKind(value: unknown): WatermarkKind {
  const normalized = String(value ?? "text").toLowerCase();
  if (normalized === "image") return "image";
  if (normalized === "fullscreen") return "fullscreen";
  return "text";
}

function normalizeFontFamily(value: unknown) {
  const normalized = String(value ?? "sans-serif").trim().toLowerCase();
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
  if (String(config.fontFamily ?? "").trim().toLowerCase() === "custom") {
    const custom = String(config.customFontFamily ?? "").trim();
    if (custom.length > 0) {
      return custom;
    }
  }
  return normalizeFontFamily(config.fontFamily);
}

function normalizeCoord(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
}

function normalizeCoordPair(value: unknown) {
  const source = value as Record<string, unknown> | null | undefined;
  return {
    x: normalizeCoord(source?.x, 0),
    y: normalizeCoord(source?.y, 0),
  };
}

function resolveAnchor(position: PositionType) {
  if (position === "custom") {
    return { anchorX: 0, anchorY: 0, isRight: false, isTop: true };
  }

  const isRight = position.startsWith("r");
  const isTop = position.endsWith("t");
  return {
    anchorX: isRight ? 1 : 0,
    anchorY: isTop ? 0 : 1,
    isRight,
    isTop,
  };
}

async function loadTextureFromDataUri(dataUri: string) {
  const response = await fetch(dataUri);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  return {
    texture: PIXI.Texture.from(bitmap),
    bitmap,
  };
}

export default async function App(config: Config, imageOrVideo: TemplateVideoInput, logger: TemplateLogger) {
  logger.info("Basic 模板启动", config, Boolean(PIXI.Application));

  const [width, height] = imageOrVideo.resolution;
  const baselineScale = Math.sqrt((Math.max(width, 1) * Math.max(height, 1)) / (1920 * 1080));
  const baseSize = Number(config.size ?? 100);
  const size = Math.max(14, Math.round(baseSize * baselineScale));
  const textColor = normalizeRgba(config.textColor, { r: 255, g: 255, b: 255, a: 0.1 });
  const strokeColor = normalizeRgba(config.strokeColor, { r: 0, g: 0, b: 0, a: 0 });
  const textBackgroundColor = normalizeRgba(config.textBackgroundColor, { r: 0, g: 0, b: 0, a: 0 });
  const fullScreenColor = normalizeRgba(config.fullScreenColor, { r: 255, g: 255, b: 255, a: 0.1 });
  const fullScreenStrokeColor = normalizeRgba(config.fullScreenStrokeColor, { r: 0, g: 0, b: 0, a: 0 });
  const fullScreenBackgroundColor = normalizeRgba(config.fullScreenBackgroundColor, { r: 0, g: 0, b: 0, a: 0 });
  const textBackgroundSize = normalizeSizeValue(config.textBackgroundSize);
  const fullScreenBackgroundSize = normalizeSizeValue(config.fullScreenBackgroundSize);
  const text = normalizeText(config.text, "水印");
  const subtitle = normalizeText(config.subtitle, "");
  const fullScreenText = normalizeText(config.fullScreenText, "WATERMARK");
  const lineSpacing = Math.max(1, Number(config.lineSpacing ?? 1.8));
  const rotationDegrees = Number(config.rotation ?? -24);
  const kind = normalizeKind(config.kind);
  const fontFamily = resolveFontFamily(config);
  const position = config.position;
  const customCoord = normalizeCoordPair(config.customCoord);
  const customX = customCoord.x;
  const customY = customCoord.y;

  const output = imageOrVideo.output();
  const canvas = output.source;
  PIXI.DOMAdapter.set(PIXI.WebWorkerAdapter);
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
  const anchor = resolveAnchor(position);
  const baseX = position === "custom" ? customX : (anchor.isRight ? width - padX : padX);
  const baseY = position === "custom" ? customY : (anchor.isTop ? padY : height - padY);

  let watermarkBitmap: ImageBitmap | null = null;
  let watermarkTexture: PIXI.Texture | null = null;

  if (kind === "image") {
    const imageData = String(config.imageData ?? "").trim();
    if (imageData.length > 0) {
      try {
        const loaded = await loadTextureFromDataUri(imageData);
        watermarkTexture = loaded.texture;
        watermarkBitmap = loaded.bitmap;
      } catch (error) {
        logger.error("图像水印加载失败", error);
      }
    }

    if (watermarkTexture) {
      const sprite = new PIXI.Sprite(watermarkTexture);
      sprite.alpha = 1;
      sprite.anchor.set(anchor.anchorX, anchor.anchorY);
      sprite.position.set(baseX, baseY);

      const targetWidth = Math.max(24, Math.round(size * 3));
      const textureWidth = Math.max(1, sprite.texture.width);
      const scale = targetWidth / textureWidth;
      sprite.scale.set(scale);
      stage.addChild(sprite);
    }
  } else if (kind === "text") {
    const gap = Math.max(8, Math.round(size * 0.18));
    const subtitleSize = Math.max(12, Math.round(size * 0.42));

    const textLayer = new PIXI.Container();
    const strokeThickness = Math.max(0, Math.round(size * 0.06 * strokeColor.a));

    const mainText = new PIXI.Text({
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
    mainText.alpha = textColor.a;
    mainText.anchor.set(0.5, 0.5);
    textLayer.addChild(mainText);

    const subText = new PIXI.Text({
      text: subtitle,
      style: new PIXI.TextStyle({
        fill: rgbaToNumber(textColor),
        fontSize: subtitleSize,
        fontWeight: "500",
        fontFamily,
        stroke: {
          color: rgbaToNumber(strokeColor),
          width: Math.max(0, Math.round(strokeThickness * 0.7)),
        },
      }),
    });
    subText.visible = subtitle.length > 0;
    subText.alpha = textColor.a;
    subText.anchor.set(0.5, 0.5);

    if (subText.visible) {
      const mainHeight = Math.max(1, mainText.height);
      const subHeight = Math.max(1, subText.height);
      const totalHeight = mainHeight + gap + subHeight;
      mainText.position.set(0, -totalHeight / 2 + mainHeight / 2);
      subText.position.set(0, totalHeight / 2 - subHeight / 2);
      textLayer.addChild(subText);
    } else {
      mainText.position.set(0, 0);
    }

    const textBounds = textLayer.getLocalBounds();
    const extraWidth = Math.max(0, textBackgroundSize.width) * baselineScale;
    const extraHeight = Math.max(0, textBackgroundSize.height) * baselineScale;
    const backgroundWidth = Math.max(1, textBounds.width + extraWidth);
    const backgroundHeight = Math.max(1, textBounds.height + extraHeight);

    if (textBackgroundColor.a > 0) {
      const background = new PIXI.Sprite(PIXI.Texture.WHITE);
      background.anchor.set(0.5, 0.5);
      background.tint = rgbaToNumber(textBackgroundColor);
      background.alpha = textBackgroundColor.a;
      background.width = backgroundWidth;
      background.height = backgroundHeight;
      textLayer.addChildAt(background, 0);
    }

    const bounds = textLayer.getLocalBounds();
    const anchorLocalX = bounds.x + bounds.width * anchor.anchorX;
    const anchorLocalY = bounds.y + bounds.height * anchor.anchorY;
    textLayer.position.set(baseX - anchorLocalX, baseY - anchorLocalY);
    stage.addChild(textLayer);
  } else {
    const fullScreenLayer = new PIXI.Container();
    fullScreenLayer.position.set(width / 2, height / 2);
    fullScreenLayer.rotation = (rotationDegrees * Math.PI) / 180;

    const fullScreenStrokeThickness = Math.max(0, Math.round(size * 0.06 * fullScreenStrokeColor.a));
    const fullScreenTextStyle = new PIXI.TextStyle({
      fill: rgbaToNumber(fullScreenColor),
      fontSize: size,
      fontWeight: "700",
      fontFamily,
      stroke: {
        color: rgbaToNumber(fullScreenStrokeColor),
        width: fullScreenStrokeThickness,
      },
    });

    const sampleText = new PIXI.Text({ text: fullScreenText, style: fullScreenTextStyle });
    sampleText.alpha = fullScreenColor.a;
    sampleText.anchor.set(0.5, 0.5);

    const fullScreenExtraWidth = Math.max(0, fullScreenBackgroundSize.width) * baselineScale;
    const fullScreenExtraHeight = Math.max(0, fullScreenBackgroundSize.height) * baselineScale;
    const fullScreenBackgroundWidth = Math.max(1, sampleText.width + fullScreenExtraWidth);
    const fullScreenBackgroundHeight = Math.max(1, sampleText.height + fullScreenExtraHeight);

    const tileWidth = Math.max(fullScreenBackgroundWidth + size, size * 4);
    const tileHeight = Math.max(fullScreenBackgroundHeight * lineSpacing, size * 1.2);

    sampleText.destroy();

    for (let y = -height * 1.5; y <= height * 1.5; y += tileHeight) {
      for (let x = -width * 1.5; x <= width * 1.5; x += tileWidth) {
        const nodeLayer = new PIXI.Container();
        nodeLayer.position.set(x, y);

        if (fullScreenBackgroundColor.a > 0) {
          const background = new PIXI.Sprite(PIXI.Texture.WHITE);
          background.anchor.set(0.5, 0.5);
          background.tint = rgbaToNumber(fullScreenBackgroundColor);
          background.alpha = fullScreenBackgroundColor.a;
          background.width = fullScreenBackgroundWidth;
          background.height = fullScreenBackgroundHeight;
          nodeLayer.addChild(background);
        }

        const node = new PIXI.Text({
          text: fullScreenText,
          style: fullScreenTextStyle,
        });
        node.alpha = fullScreenColor.a;
        node.anchor.set(0.5, 0.5);
        nodeLayer.addChild(node);
        fullScreenLayer.addChild(nodeLayer);
      }
    }
    stage.addChild(fullScreenLayer);
  }

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
    watermarkTexture?.destroy(true);
    watermarkBitmap?.close();
    app.destroy(false);
  }
}
