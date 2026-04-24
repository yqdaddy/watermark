# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watermark is a mobile-first static PWA for generating watermarks on images and videos. Users select templates, configure parameters, upload media, and download processed results.

## Development Commands

```bash
pnpm dev              # Start Vite dev server
pnpm typecheck        # TypeScript check (tsc --noEmit)
pnpm lint             # ESLint with react-hooks and react-refresh plugins
pnpm build            # Production build (tsc -b && vite build)
pnpm preview          # Preview production build locally
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting without modifying
```

Node version requirement: `>=20.19.0` (declared in package.json).

## Architecture Overview

### Page Structure
- **StartPage**: Template selection, parameter configuration, media upload, watermark generation
- **CreatePage**: Template editor with file tree, Monaco code editor, zip import/export
- **SettingsPage**: Runtime settings

### Template System

Templates are TypeScript files compiled and executed in-browser. A template exports:
- `export default async function App(config, input, logger)` — the main rendering function
- `export class Config` — optional class decorated with `@schema.*` for configurable parameters

**Schema Decorators** (`src/template/schema/schema.ts`):
```typescript
import { schema } from "schema";

export class Config {
  @schema.string("水印文本") text: string = "Sample";
  @schema.number("透明度") opacity: number = 0.5;
  @schema.rgba("颜色") color = { r: 255, g: 0, b: 0, a: 1 };
  @schema.enum("位置", ["top", "center", "bottom"]) position: "top" | "center" | "bottom" = "center";
  @schema.if(c => c.position === "top") // conditional field visibility
  @schema.number("顶部偏移") topOffset: number = 10;
}
```

Available decorators: `string`, `number`, `boolean`, `image`, `rgb`, `rgba`, `size`, `coord`, `enum`, `select`, `group`, `grid`, `if`.

**Built-in Module Imports** (available in templates):
- `import { schema } from "schema"` — schema decorators
- `import * as PIXI from "pixi.js"` — PixiJS rendering
- `import type { TemplateVideoInput, TemplateLogger } from "typings"` — type definitions

### Runtime Architecture (`src/template/runtime/`)

Templates can run in two modes:
- **Worker mode**: For video processing (heavy CPU work)
- **Main-thread mode**: For image processing (lighter work)

Key files:
- `bundler.ts`: Compiles workspace files into CommonJS bundle using Babel
- `compiler.ts`: Entry point for compilation
- `sharedTemplateRunner.ts`: Core execution logic with PixiJS and WebCodecs lifecycle guards
- `templateWorkerSession.ts`: Worker communication protocol
- `workerRunner.ts`: Unified session API

**Important Lifecycle Guards** (`sharedTemplateRunner.ts`):
- PixiJS initialization patches for Safari double-evaluation bug
- Firefox 149 AVCC WebCodecs bug fix (H.264 NAL unit sanitization)
- TexturePool lifecycle management
- Application.destroy() patch to prevent releasing global resources

### Media Processing

Uses `mediabunny` library for video encoding:
- `CanvasSink` for decoding video to OffscreenCanvas
- `CanvasSource` + `EncodedPacketSink` for encoding
- `Mp4OutputFormat` + `BufferTarget` for output

Templates receive `VideoInput` with:
- `.source`: OffscreenCanvas for rendering
- `.onFrame(callback)`: Register frame callback
- `.start()`: Begin frame iteration
- `.output()`: Create output sink

### Important Patterns

1. **Worker Communication** (`workerProtocol.ts`): Message types are `init-template`, `evaluate-config`, `run-template`, `dispose-template`. Each has a requestId for tracking.

2. **Zip Import/Export** (`src/utils/zip/templateZip.ts`): Templates are packaged as zip files with TypeScript source.

3. **PWA Configuration** (`vite.config.ts`): VitePWA plugin with workbox caching, navigate fallback, media runtime caching.

4. **Path Alias**: `schema` resolves to `./src/template/schema/index.ts` (configured in vite.config.ts and tsconfig.json).

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/template/schema/schema.ts` | Schema decorator system (WeakMap-based field registration) |
| `src/template/runtime/bundler.ts` | Babel transpilation + CommonJS bundle generation |
| `src/template/runtime/sharedTemplateRunner.ts` | Template execution + PixiJS/WebCodecs guards |
| `src/template/runtime/workerRunner.ts` | Unified runtime session API |
| `src/template/typings/index.ts` | Template type definitions |
| `src/features/start/StartWorkflow.tsx` | Main workflow component |
| `src/features/create/TemplateEditor.tsx` | Template editor UI |
| `src/media/interfaces.ts` | VideoInput/VideoOutput interfaces |