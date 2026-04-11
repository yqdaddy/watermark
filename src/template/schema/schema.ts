export interface FieldRGB {
  r: number;
  g: number;
  b: number;
}

export interface FieldRGBA extends FieldRGB {
  a: number;
}

export interface FieldSize {
  width: number;
  height: number;
}

export interface CoordSize {
  x: number;
  y: number;
}

export type PrimitiveFieldType = "string" | "number" | "boolean" | "enum" | "image";

export interface SelectFieldOption {
  label: string;
  value: string | number;
}

export type CompositeFieldType = "rgb" | "rgba" | "size" | "coord";

export type FieldType = PrimitiveFieldType | "select" | CompositeFieldType;

export type SchemaIfPredicate = (config: Record<string, unknown>) => boolean;

export interface SchemaField {
  kind: FieldType;
  name: string;
  description?: string;
  key: string;
  required?: boolean;
  default?: string | number | boolean | FieldRGB | FieldRGBA | FieldSize | CoordSize;
  options?: SelectFieldOption[];
  group?: string;
  groupPath?: string[];
  gridIndex?: number;
  when?: SchemaIfPredicate[];
}

type InternalSchemaField = Partial<Omit<SchemaField, "key">> & {
  key: string;
  when: SchemaIfPredicate[];
  order: number;
};

const fieldStore = new WeakMap<object, Map<string, InternalSchemaField>>();
const fieldOrderStore = new WeakMap<object, string[]>();

function ensureFieldMap(target: object) {
  let map = fieldStore.get(target);
  if (!map) {
    map = new Map<string, InternalSchemaField>();
    fieldStore.set(target, map);
  }

  let order = fieldOrderStore.get(target);
  if (!order) {
    order = [];
    fieldOrderStore.set(target, order);
  }

  return { map, order };
}

function registerFieldPatch(target: object, key: string, patch: Partial<Omit<SchemaField, "key">>) {
  const { map, order } = ensureFieldMap(target);
  const existing = map.get(key);
  const next: InternalSchemaField =
    existing ?? {
      key,
      when: [],
      order: order.length,
    };

  if (!existing) {
    order.push(key);
  }

  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.required !== undefined) next.required = patch.required;
  if (patch.default !== undefined) next.default = patch.default;
  if (patch.options !== undefined) next.options = patch.options;
  if (patch.group !== undefined) next.group = patch.group;
  if (patch.groupPath && patch.groupPath.length > 0) {
    const existingPath = next.groupPath ?? (next.group ? [next.group] : []);
    next.groupPath = [...patch.groupPath, ...existingPath];
  }
  if (patch.gridIndex !== undefined) next.gridIndex = patch.gridIndex;
  if (patch.when && patch.when.length > 0) {
    next.when.push(...patch.when);
  }

  map.set(key, next);
}

function applyPatch(
  context: { name: string | symbol; metadata?: object; addInitializer?: (cb: () => void) => void },
  patchFactory: (key: string) => Partial<Omit<SchemaField, "key">>,
) {
  const key = String(context.name);
  const patch = patchFactory(key);

  if (context.metadata) {
    registerFieldPatch(context.metadata, key, patch);
  }

  if (typeof context.addInitializer === "function") {
    context.addInitializer(function (this: { constructor?: object }) {
      const owner = this?.constructor;
      if (owner) {
        registerFieldPatch(owner, key, patch);
      }
    });
  }
}

function makeDecorator(field: Omit<SchemaField, "key">) {
  return function (
    _value: unknown,
    context: { name: string | symbol; metadata?: object; addInitializer?: (cb: () => void) => void },
  ) {
    applyPatch(context, () => field);
  };
}

export const schema = {
  string(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "string",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  number(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "number",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  boolean(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "boolean",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  image(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "image",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  rgb(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "rgb",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  rgba(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "rgba",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  size(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "size",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  coord(name: string, options?: { description?: string; required?: boolean }) {
    return makeDecorator({
      kind: "coord",
      name,
      description: options?.description,
      required: options?.required,
    });
  },
  enum(
    name: string,
    enumValues: Array<string | number>,
    options?: { description?: string; required?: boolean },
  ) {
    return makeDecorator({
      kind: "enum",
      name,
      description: options?.description,
      options: enumValues.map((value) => ({ label: String(value), value })),
      required: options?.required,
    });
  },
  select(
    name: string,
    enumMap: Record<string, string | number>,
    options?: { description?: string; required?: boolean },
  ) {
    return makeDecorator({
      kind: "select",
      name,
      description: options?.description,
      options: Object.entries(enumMap).map(([label, value]) => ({ label, value })),
      required: options?.required,
    });
  },
  group(name: string) {
    return function (
      _value: unknown,
      context: { name: string | symbol; metadata?: object; addInitializer?: (cb: () => void) => void },
    ) {
      applyPatch(context, () => ({ groupPath: [name] }));
    };
  },
  grid(group: string, gridIndex: number) {
    return function (
      _value: unknown,
      context: { name: string | symbol; metadata?: object; addInitializer?: (cb: () => void) => void },
    ) {
      applyPatch(context, () => ({ groupPath: [group], gridIndex }));
    };
  },
  if(predicate: SchemaIfPredicate) {
    return function (
      _value: unknown,
      context: { name: string | symbol; metadata?: object; addInitializer?: (cb: () => void) => void },
    ) {
      applyPatch(context, () => ({ when: [predicate] }));
    };
  },
};

export const scheme = schema;

export function getSchemaFields(target: object | null | undefined): SchemaField[] {
  if (!target) return [];

  const directMap = fieldStore.get(target);
  if (directMap) {
    const directOrder = fieldOrderStore.get(target) ?? [];
    return directOrder
      .map((key) => directMap.get(key))
      .filter((field): field is InternalSchemaField => Boolean(field?.kind && field?.name))
      .map((field) => ({
        groupPath:
          field.groupPath && field.groupPath.length > 0
            ? [...field.groupPath]
            : field.group
              ? [field.group]
              : undefined,
        key: field.key,
        kind: field.kind!,
        name: field.name!,
        description: field.description,
        required: field.required,
        default: field.default,
        options: field.options,
        gridIndex: field.gridIndex,
        group:
          field.groupPath && field.groupPath.length > 0
            ? field.groupPath[field.groupPath.length - 1]
            : field.group,
        when: field.when.length > 0 ? [...field.when] : undefined,
      }));
  }

  const ctor = (target as { constructor?: object }).constructor;
  if (ctor) {
    const ctorMap = fieldStore.get(ctor);
    if (!ctorMap) return [];
    const ctorOrder = fieldOrderStore.get(ctor) ?? [];
    return ctorOrder
      .map((key) => ctorMap.get(key))
      .filter((field): field is InternalSchemaField => Boolean(field?.kind && field?.name))
      .map((field) => ({
        groupPath:
          field.groupPath && field.groupPath.length > 0
            ? [...field.groupPath]
            : field.group
              ? [field.group]
              : undefined,
        key: field.key,
        kind: field.kind!,
        name: field.name!,
        description: field.description,
        required: field.required,
        default: field.default,
        options: field.options,
        gridIndex: field.gridIndex,
        group:
          field.groupPath && field.groupPath.length > 0
            ? field.groupPath[field.groupPath.length - 1]
            : field.group,
        when: field.when.length > 0 ? [...field.when] : undefined,
      }));
  }

  return [];
}

function fallbackForField(field: SchemaField): unknown {
  if (field.default !== undefined) return field.default;
  if (field.kind === "boolean") return false;
  if (field.kind === "rgb") return { r: 255, g: 255, b: 255 } satisfies FieldRGB;
  if (field.kind === "rgba") return { r: 255, g: 255, b: 255, a: 1 } satisfies FieldRGBA;
  if (field.kind === "size") return { width: 0, height: 0 } satisfies FieldSize;
  if (field.kind === "coord") return { x: 0, y: 0 } satisfies CoordSize;
  return undefined;
}

export function isSchemaFieldEnabled(field: SchemaField, config: Record<string, unknown>) {
  if (!field.when || field.when.length === 0) return true;

  for (const predicate of field.when) {
    try {
      if (!predicate(config)) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

export function normalizeSchemaConfig(fields: SchemaField[], config: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...config };

  for (const field of fields) {
    const enabled = isSchemaFieldEnabled(field, normalized);
    const fallback = fallbackForField(field);

    if (!enabled) {
      if (fallback !== undefined) {
        normalized[field.key] = fallback;
      }
      continue;
    }

    if (normalized[field.key] === undefined && fallback !== undefined) {
      normalized[field.key] = fallback;
    }
  }

  return normalized;
}

export function getEnabledSchemaFields(fields: SchemaField[], config: Record<string, unknown>) {
  const normalized = normalizeSchemaConfig(fields, config);
  return fields.filter((field) => isSchemaFieldEnabled(field, normalized));
}
