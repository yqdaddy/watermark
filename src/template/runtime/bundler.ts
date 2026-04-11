import * as Babel from "@babel/standalone";

export type TemplateWorkspaceFiles = Record<string, string>;

export interface SyncBundleResult {
  code: string;
  entryId: string;
  moduleOrder: string[];
}

const schemaBuiltinModuleId = "schema";
const pixiBuiltinModuleId = "pixi.js";
const typingsBuiltinModuleId = "typings";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function dirname(path: string): string {
  const parts = normalizePath(path).split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

function resolveRelativePath(fromFile: string, request: string): string {
  const base = dirname(fromFile);
  const input = `${base}/${request}`.replace(/\\/g, "/");
  const segments = input.split("/");
  const stack: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  return stack.join("/");
}

function resolveModuleId(request: string, importer: string, files: TemplateWorkspaceFiles): string {
  if (request === schemaBuiltinModuleId) return schemaBuiltinModuleId;
  if (request === pixiBuiltinModuleId) return pixiBuiltinModuleId;
  if (request === typingsBuiltinModuleId) return typingsBuiltinModuleId;
  if (!request.startsWith(".")) {
    throw new Error(`仅支持相对依赖与内建模块 schema/pixi.js/typings，当前依赖: ${request}`);
  }

  const base = resolveRelativePath(importer, request);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];

  for (const candidate of candidates.map(normalizePath)) {
    if (Object.prototype.hasOwnProperty.call(files, candidate)) {
      return candidate;
    }
  }

  throw new Error(`无法解析依赖: ${request} (importer: ${importer})`);
}

function parseStaticImports(source: string): string[] {
  const fromMatches = [
    ...source.matchAll(/(?:import|export)\s+[^\n;]*?from\s+["']([^"']+)["']/g),
  ].map((m) => m[1]);
  const bareMatches = [...source.matchAll(/import\s+["']([^"']+)["']/g)].map((m) => m[1]);
  return [...new Set([...fromMatches, ...bareMatches])];
}

function schemaBuiltinModuleCode(): string {
  return `
module.exports = (globalThis.__templateBuiltins && globalThis.__templateBuiltins["schema"]) || {};
`;
}

function pixiBuiltinModuleCode(): string {
  return `module.exports = (globalThis.__templateBuiltins && globalThis.__templateBuiltins["pixi.js"]) || {};`;
}

function typingsBuiltinModuleCode(): string {
  return `module.exports = (globalThis.__templateBuiltins && globalThis.__templateBuiltins["typings"]) || {};`;
}

async function transpileModule(code: string, filename: string): Promise<string> {
  const output = Babel.transform(code, {
    filename,
    presets: [
      ["env", { targets: "defaults", modules: "commonjs" }],
      "typescript",
      ["react", { runtime: "automatic" }],
    ],
    plugins: [["proposal-decorators", { version: "2023-11" }]],
    sourceMaps: false,
    comments: false,
  });

  return output.code ?? "";
}

export async function compileWorkspaceToSyncBundle(
  files: TemplateWorkspaceFiles,
  entry = "index.ts",
): Promise<SyncBundleResult> {
  const normalizedFiles: TemplateWorkspaceFiles = {};
  for (const [path, content] of Object.entries(files)) {
    normalizedFiles[normalizePath(path)] = content;
  }

  const entryId = resolveModuleId(`./${entry}`, "", normalizedFiles);
  const orderedModules: string[] = [];
  const visited = new Set<string>();
  const builtInModuleIds = new Set([
    schemaBuiltinModuleId,
    pixiBuiltinModuleId,
    typingsBuiltinModuleId,
  ]);

  function dfs(fileId: string) {
    if (visited.has(fileId) || builtInModuleIds.has(fileId)) return;
    visited.add(fileId);

    const source = normalizedFiles[fileId];
    if (source === undefined) {
      throw new Error(`工作区文件缺失: ${fileId}`);
    }

    const deps = parseStaticImports(source);
    for (const dep of deps) {
      const resolved = resolveModuleId(dep, fileId, normalizedFiles);
      dfs(resolved);
    }

    orderedModules.push(fileId);
  }

  dfs(entryId);

  const moduleRecords: string[] = [];

  for (const fileId of orderedModules) {
    const source = normalizedFiles[fileId];
    const transformed = await transpileModule(source, fileId);
    moduleRecords.push(`"${fileId}": function(require, module, exports){\n${transformed}\n}`);
  }

  moduleRecords.push(
    `"${schemaBuiltinModuleId}": function(require, module, exports){\n${schemaBuiltinModuleCode()}\n}`,
  );
  moduleRecords.push(
    `"${pixiBuiltinModuleId}": function(require, module, exports){\n${pixiBuiltinModuleCode()}\n}`,
  );
  moduleRecords.push(
    `"${typingsBuiltinModuleId}": function(require, module, exports){\n${typingsBuiltinModuleCode()}\n}`,
  );

  const code = `
"use strict";
const __modules = {
${moduleRecords.join(",\n")}
};
const __cache = {};
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  const modFactory = __modules[id];
  if (!modFactory) {
    throw new Error("Module not found: " + id);
  }
  const module = { exports: {} };
  __cache[id] = module;
  modFactory(__require, module, module.exports);
  return module.exports;
}
return __require("${entryId}");
`;

  return {
    code,
    entryId,
    moduleOrder: [
      ...orderedModules,
      schemaBuiltinModuleId,
      pixiBuiltinModuleId,
      typingsBuiltinModuleId,
    ],
  };
}
