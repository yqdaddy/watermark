/**
 * 用户保存的参数模版类型定义
 *
 * 存储用户配置好的参数，可以快速复用。
 * 不包含 workspace 文件，运行时引用来源模版的 workspace。
 */

export interface SavedParamTemplate {
  /** 唯一标识，格式: "saved-{timestamp}" */
  id: string;

  /** 用户定义的模版名称 */
  name: string;

  /** 来源模版 ID（basic, dynamic, 或导入的自定义模版 ID） */
  sourceTemplateId: string;

  /** 来源模版显示名，用于 UI 展示 */
  sourceTemplateName: string;

  /** 用户原始参数输入 */
  params: Record<string, unknown>;

  /** 经过 schema 规范化后的参数 */
  normalizedParams: Record<string, unknown>;

  /** 创建时间戳 */
  createdAt: number;

  /** 最后更新时间戳 */
  updatedAt: number;

  /** 支持的媒体类型（继承自来源模版） */
  mediaType: "image" | "video" | "both";

  /** 可选缩略图（base64，用于图片水印类型的快速预览） */
  thumbnail?: string;
}

/**
 * localStorage 存储结构
 */
export interface SavedParamTemplatesStorage {
  version: 1;
  templates: SavedParamTemplate[];
  lastCleanupAt: number;
}

/**
 * Zip 导入时的用户模版格式
 */
export interface SavedParamTemplateImport {
  type: "saved-param-template";
  savedTemplate: SavedParamTemplate;
  workspaceFiles: Record<string, string>;
}