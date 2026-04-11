export type StepState = "editing" | "processing" | "finished";

export type InputMediaType = "image" | "video";

export type TemplateFieldType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "select"
  | "image"
  | "rgb"
  | "rgba"
  | "size"
  | "coord";

export interface TemplateFieldOption {
  label: string;
  value: string | number;
}

export interface TemplateField {
  key: string;
  label: string;
  description?: string;
  type: TemplateFieldType;
  required?: boolean;
  defaultValue?:
    | string
    | number
    | boolean
    | { r: number; g: number; b: number }
    | { r: number; g: number; b: number; a: number }
    | { width: number; height: number }
    | { x: number; y: number };
  options?: TemplateFieldOption[];
  group?: string;
  groupPath?: string[];
  gridIndex?: number;
}

export interface WatermarkTemplate {
  id: string;
  name: string;
  mediaType: InputMediaType | "both";
  fields: TemplateField[];
  builtInWorkspaceId?: string;
}

export interface GeneratedAsset {
  name: string;
  blob: Blob;
}

export interface GenerationProgress {
  percentage: number;
  message: string;
}
