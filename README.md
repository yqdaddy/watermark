# Watermark

移动优先的静态 PWA，用于图片/视频水印生成。

## 本地开发

```bash
pnpm install
pnpm dev
```

## 本地检查

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Vercel 部署

项目已包含可直接使用的 [vercel.json](vercel.json)：

- framework: `vite`
- installCommand: `pnpm install --frozen-lockfile`
- buildCommand: `pnpm build`
- outputDirectory: `dist`
- SPA 回退路由：`/((?!.*\\.).*) -> /index.html`

### 面板配置步骤

1. 在 Vercel 中点击 `Add New Project` 并导入该仓库。
2. `Framework Preset` 选择 `Vite`（或保持自动识别）。
3. `Root Directory` 保持仓库根目录。
4. `Build and Output Settings` 使用仓库内 `vercel.json`（无需额外覆盖）。
5. 点击 `Deploy`。

### 可选：CLI 部署

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

## 说明

- Node 版本在 [package.json](package.json) 中已声明：`>=20.19.0`。
- 如果你启用了自定义域名，记得在 Vercel 项目设置中完成域名绑定与 DNS 解析。
