import { cache } from "react";
import type { CSSProperties } from "react";

import {
  get_rem,
  map_rem,
  type Rem_Map,
} from "./tokens";

export type CSS_Value =
  | Rem_Map
  | string
  | number
  | number[]
  | null
  | undefined;

export type CSS_Object = {
  [K in keyof CSSProperties]?:
    | CSSProperties[K]
    | CSS_Value;
} & {
  [key: `--${string}`]: CSS_Value;
} & {
  [key: string]: CSS_Value | CSS_Object;
};

export type CSS_Emitted_Rule = {
  class_name: string;
  rule: string;
};

type CSS_Store = {
  class_map: Map<string, string>;
  class_rule_map: Map<string, string>;
  keyframes_map: Map<string, string>;
  keyframes_rule_map: Map<string, string>;
};

const CSS_UNITLESS = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zoom",
  "zIndex",
  "fillOpacity",
  "floodOpacity",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
]);

const SUPPORTED_AT_RULES = [
  "@media",
  "@supports",
  "@container",
  "@layer",
  "@scope",
  "@starting-style",
] as const;

type Supported_At_Rule =
  (typeof SUPPORTED_AT_RULES)[number];

const KEYFRAMES_RE =
  /^(@(?:-webkit-)?keyframes)\s+(.+?)\s*$/i;

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

const server_get_store =
  typeof window === "undefined"
    ? cache((): CSS_Store => ({
        class_map: new Map(),
        class_rule_map: new Map(),
        keyframes_map: new Map(),
        keyframes_rule_map: new Map(),
      }))
    : null;

const client_store: CSS_Store | null =
  typeof window === "undefined"
    ? null
    : {
        class_map: new Map(),
        class_rule_map: new Map(),
        keyframes_map: new Map(),
        keyframes_rule_map: new Map(),
      };

export function get_store(): CSS_Store {
  return server_get_store ? server_get_store() : client_store!;
}

function get_hash(value: string): string {
  let hash = 5381;

  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
}

function to_css_property(property: string): string {
  if (property.startsWith("--")) {
    return property;
  }

  if (/^ms[A-Z]/.test(property)) {
    property = `-${property}`;
  }

  return property.replace(
    /[A-Z]/g,
    (character) => `-${character.toLowerCase()}`,
  );
}

function is_unitless_property(property: string): boolean {
  if (CSS_UNITLESS.has(property)) {
    return true;
  }

  const vendor_match = property.match(
    /^(Webkit|Moz|ms|O)(.+)$/,
  );

  return vendor_match
    ? CSS_UNITLESS.has(vendor_match[2])
    : false;
}

function is_nested_object(
  value: unknown,
): value is CSS_Object {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function get_at_rule_name(
  value: string,
): Supported_At_Rule | undefined {
  const match = value.match(/^@[a-z-]+(?=\s|$)/i);

  if (match === null) {
    return undefined;
  }

  const name = match[0].toLowerCase();

  return SUPPORTED_AT_RULES.includes(
    name as Supported_At_Rule,
  )
    ? (name as Supported_At_Rule)
    : undefined;
}

function get_keyframes_name(
  key: string,
): { at_rule: string; name: string } | null {
  const match = key.match(KEYFRAMES_RE);

  return match === null
    ? null
    : { at_rule: match[1], name: match[2] };
}

function split_selector_list(
  selector: string,
): string[] {
  const result: string[] = [];

  let start = 0;
  let parentheses = 0;
  let brackets = 0;

  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (let i = 0; i < selector.length; i++) {
    const character = selector[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (
      character === "'" ||
      character === '"'
    ) {
      quote = character;
      continue;
    }

    if (character === "(") {
      parentheses++;
      continue;
    }

    if (character === ")") {
      parentheses = Math.max(0, parentheses - 1);
      continue;
    }

    if (character === "[") {
      brackets++;
      continue;
    }

    if (character === "]") {
      brackets = Math.max(0, brackets - 1);
      continue;
    }

    if (
      character === "," &&
      parentheses === 0 &&
      brackets === 0
    ) {
      const part = selector
        .slice(start, i)
        .trim();

      if (part) {
        result.push(part);
      }

      start = i + 1;
    }
  }

  const last = selector
    .slice(start)
    .trim();

  if (last) {
    result.push(last);
  }

  return result;
}

function resolve_selector(
  parent: string,
  nested: string,
): string {
  const parents = parent
    ? split_selector_list(parent)
    : ["&"];

  const nested_selectors =
    split_selector_list(nested);

  const result: string[] = [];

  for (const parent_selector of parents) {
    for (const nested_selector of nested_selectors) {
      if (nested_selector.includes("&")) {
        result.push(
          nested_selector.replaceAll(
            "&",
            parent_selector,
          ),
        );

        continue;
      }

      if (/^[>+~:[(]/.test(nested_selector)) {
        result.push(
          `${parent_selector}${nested_selector}`,
        );

        continue;
      }

      result.push(
        `${parent_selector} ${nested_selector}`,
      );
    }
  }

  return result.join(", ");
}

function format_value(
  property: string,
  value: CSS_Value,
): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (is_unitless_property(property)) {
      return value.join(" ");
    }

    return map_rem(value);
  }

  if (typeof value === "number") {
    if (is_unitless_property(property)) {
      return String(value);
    }

    return get_rem(value);
  }

  return String(value);
}

function hash_keyframes(
  keyframes_object: CSS_Object,
): string {
  const parts: string[] = [];

  for (const step of Object.keys(keyframes_object).sort()) {
    const declarations = keyframes_object[step];

    if (!is_nested_object(declarations)) {
      continue;
    }

    parts.push(step);

    for (const prop of Object.keys(declarations).sort()) {
      parts.push(prop, String(declarations[prop]));
    }
  }

  return get_hash(parts.join("|"));
}

function register_keyframes(
  store: CSS_Store,
  css_object: CSS_Object,
): void {
  for (const [key, value] of Object.entries(
    css_object,
  )) {
    if (value == null || !is_nested_object(value)) {
      continue;
    }

    const kf = get_keyframes_name(key);

    if (kf !== null) {
      store.keyframes_map.set(
        kf.name,
        `${kf.name}_${hash_keyframes(value)}`,
      );

      continue;
    }

    register_keyframes(store, value);
  }
}

function rewrite_keyframes(
  store: CSS_Store,
  value: string,
): string {
  if (store.keyframes_map.size === 0) {
    return value;
  }

  const names = [...store.keyframes_map.keys()].sort(
    (a, b) => b.length - a.length,
  );

  const escaped = names
    .map((name) =>
      name.replace(REGEX_SPECIAL, "\\$&"),
    )
    .join("|");

  const re = new RegExp(
    `(^|[^\\w-])(${escaped})(?=$|[^\\w-])`,
    "g",
  );

  return value.replace(
    re,
    (_match, pre: string, name: string) =>
      pre + (store.keyframes_map.get(name) ?? name),
  );
}

function emit_declaration(
  store: CSS_Store,
  selector: string,
  at_rules: string[],
  property: string,
  value: CSS_Value,
): CSS_Emitted_Rule | null {
  const css_property =
    to_css_property(property);

  let css_value =
    format_value(property, value);

  if (css_value === undefined) {
    return null;
  }

  if (
    property === "animation" ||
    property === "animationName"
  ) {
    css_value = rewrite_keyframes(store, css_value);
  }

  const declaration =
    `${css_property}:${css_value}`;

  const rule_key = [
    at_rules.join("|"),
    selector,
    declaration,
  ].join("|");

  const hash = get_hash(rule_key);
  const class_name = `a${hash}`;

  const existing_class =
    store.class_map.get(rule_key);

  if (existing_class !== undefined) {
    return {
      class_name: existing_class,
      rule: store.class_rule_map.get(
        existing_class,
      )!,
    };
  }

  if (store.class_rule_map.has(class_name)) {
    throw new Error(
      `CSS hash collision: ${class_name}`,
    );
  }

  const class_selector = selector
    ? selector.replaceAll(
        "&",
        `.${class_name}`,
      )
    : `.${class_name}`;

  let rule =
    `${class_selector}{${declaration}}`;

  for (
    let i = at_rules.length - 1;
    i >= 0;
    i--
  ) {
    rule = `${at_rules[i]}{${rule}}`;
  }

  store.class_map.set(
    rule_key,
    class_name,
  );

  store.class_rule_map.set(
    class_name,
    rule,
  );

  return { class_name, rule };
}

function emit_keyframes(
  store: CSS_Store,
  at_rule: string,
  original_name: string,
  keyframes_object: CSS_Object,
  at_rules: string[],
): CSS_Emitted_Rule | null {
  const hashed_name =
    store.keyframes_map.get(original_name) ??
    `${original_name}_${hash_keyframes(keyframes_object)}`;

  store.keyframes_map.set(original_name, hashed_name);

  if (store.keyframes_rule_map.has(hashed_name)) {
    return null;
  }

  let body = "";

  for (const [step, declarations] of Object.entries(
    keyframes_object,
  )) {
    if (!is_nested_object(declarations)) {
      continue;
    }

    const step_name = /^\d+$/.test(step)
      ? `${step}%`
      : step;

    let decls = "";

    for (const [prop, value] of Object.entries(
      declarations,
    )) {
      const css_prop = to_css_property(prop);

      let css_val = format_value(
        prop,
        value as CSS_Value,
      );

      if (css_val === undefined) {
        continue;
      }

      if (
        prop === "animation" ||
        prop === "animationName"
      ) {
        css_val = rewrite_keyframes(store, css_val);
      }

      decls += `${css_prop}:${css_val};`;
    }

    body += `${step_name}{${decls}}`;
  }

  let rule = `${at_rule} ${hashed_name}{${body}}`;

  for (let i = at_rules.length - 1; i >= 0; i--) {
    rule = `${at_rules[i]}{${rule}}`;
  }

  store.keyframes_rule_map.set(hashed_name, rule);

  return { class_name: "", rule };
}

function emit_css(
  store: CSS_Store,
  css_object: CSS_Object,
  parent_selector = "",
  at_rules: string[] = [],
): CSS_Emitted_Rule[] {
  const emitted: CSS_Emitted_Rule[] = [];

  for (const [key, value] of Object.entries(
    css_object,
  )) {
    if (value == null) {
      continue;
    }

    if (key.startsWith("@")) {
      const kf = get_keyframes_name(key);

      if (kf !== null) {
        if (!is_nested_object(value)) {
          throw new Error(
            `@keyframes must contain a CSS object: ${key}`,
          );
        }

        const emitted_rule = emit_keyframes(
          store,
          kf.at_rule,
          kf.name,
          value,
          at_rules,
        );

        if (emitted_rule !== null) {
          emitted.push(emitted_rule);
        }

        continue;
      }

      const at_rule_name =
        get_at_rule_name(key);

      if (at_rule_name === undefined) {
        throw new Error(
          `Unsupported at-rule: ${key}`,
        );
      }

      if (!is_nested_object(value)) {
        throw new Error(
          `At-rule must contain a CSS object: ${key}`,
        );
      }

      emitted.push(
        ...emit_css(
          store,
          value,
          parent_selector,
          [...at_rules, key],
        ),
      );

      continue;
    }

    if (is_nested_object(value)) {
      const selector =
        resolve_selector(
          parent_selector,
          key,
        );

      emitted.push(
        ...emit_css(
          store,
          value,
          selector,
          at_rules,
        ),
      );

      continue;
    }

    const emitted_rule =
      emit_declaration(
        store,
        parent_selector,
        at_rules,
        key,
        value,
      );

    if (emitted_rule !== null) {
      emitted.push(emitted_rule);
    }
  }

  return emitted;
}

export function get_emitted_css(store: CSS_Store): string {
  let result = "";

  for (const rule of store.keyframes_rule_map.values()) {
    result += rule;
  }

  for (const rule of store.class_rule_map.values()) {
    result += rule;
  }

  return result;
}

let flush_scheduled = false;
let style_el: HTMLStyleElement | null = null;

function get_style_el(): HTMLStyleElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (style_el !== null && style_el.isConnected) {
    const all = document.querySelectorAll<HTMLStyleElement>(
      "style[data-gla]",
    );

    for (const el of all) {
      if (el !== style_el) {
        el.remove();
      }
    }

    return style_el;
  }

  const existing =
    document.querySelector<HTMLStyleElement>("style[data-gla]");

  if (existing !== null) {
    style_el = existing;

    const all = document.querySelectorAll<HTMLStyleElement>(
      "style[data-gla]",
    );

    for (const el of all) {
      if (el !== style_el) {
        el.remove();
      }
    }

    return style_el;
  }

  style_el = document.createElement("style");
  style_el.setAttribute("data-gla", "");
  document.head.appendChild(style_el);

  return style_el;
}

export function schedule_client_flush(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (flush_scheduled) {
    return;
  }

  flush_scheduled = true;

  queueMicrotask(() => {
    flush_scheduled = false;

    const el = get_style_el();

    if (el === null) {
      return;
    }

    const css_text = get_emitted_css(get_store());

    if (el.textContent !== css_text) {
      el.textContent = css_text;
    }
  });
}

export function css_from_store(
  store: CSS_Store,
  css_object: CSS_Object,
): CSS_Emitted_Rule[] {
  register_keyframes(store, css_object);

  const emitted = emit_css(store, css_object);

  schedule_client_flush();

  return emitted;
}

export function css(
  css_object: CSS_Object,
): string {
  return css_from_store(
    get_store(),
    css_object,
  )
    .map((emitted_rule) => emitted_rule.class_name)
    .filter(Boolean)
    .join(" ");
}