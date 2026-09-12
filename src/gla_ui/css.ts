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
  keyframes_content_map: Map<string, string>;
  keyframes_rule_map: Map<string, string>;
};

function create_store(): CSS_Store {
  return {
    class_map: new Map(),
    class_rule_map: new Map(),
    keyframes_map: new Map(),
    keyframes_content_map: new Map(),
    keyframes_rule_map: new Map(),
  };
}

const server_get_store =
  typeof window === "undefined"
    ? cache(create_store)
    : null;

const client_store: CSS_Store | null =
  typeof window === "undefined"
    ? null
    : create_store();

export function get_store(): CSS_Store {
  return server_get_store
    ? server_get_store()
    : client_store!;
}

/* ── Константы ─────────────────────────────────────────── */

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

const SUPPORTED_AT_RULE_LIST = [
  "@media",
  "@supports",
  "@container",
  "@layer",
  "@scope",
  "@starting-style",
] as const;

type Supported_At_Rule =
  (typeof SUPPORTED_AT_RULE_LIST)[number];

const SUPPORTED_AT_RULES = new Set<Supported_At_Rule>(
  SUPPORTED_AT_RULE_LIST,
);

const KEYFRAMES_RE =
  /^(@(?:-webkit-)?keyframes)\s+(.+?)\s*$/i;

// FIX: убран lookahaed — `@media(...)` без пробела теперь валиден
const AT_RULE_NAME_RE = /^@[a-zA-Z-]+/;

// FIX: идентификаторы в animation/animationName — связывание имён
// keyframes откладывается до get_emitted_css (forward references)
const ANIMATION_IDENT_RE =
  /(?<![\p{L}\p{N}_-])([\p{L}_][\p{L}\p{N}_-]*)(?![\p{L}\p{N}_-])(?!\()/gu;

// зарезервированные слова shorthand `animation` (custom-ident их исключает)
const ANIMATION_KEYWORDS = new Set([
  "none",
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
  "infinite",
  "ease",
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
  "forwards",
  "backwards",
  "both",
  "running",
  "paused",
  "jump-start",
  "jump-end",
  "jump-none",
  "jump-both",
  "initial",
  "inherit",
  "unset",
  "revert",
  "revert-layer",
]);

// private use area — в легитимных значениях не встречается
const KF_TOKEN_START = "\uE000";
const KF_TOKEN_END = "\uE001";
const KF_TOKEN_RE = /\uE000([^\uE001]*)\uE001/g;

// FIX: \u0001 вместо "|" — селекторы/значения не дают коллизий ключей
const SEPARATOR = "\u0001";

const CACHE_LIMIT = 1000;

/* ── Утилиты ───────────────────────────────────────────── */

function get_hash(value: string): string {
  let hash = 5381;

  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
}

const css_property_cache = new Map<string, string>();

function to_css_property(property: string): string {
  const cached = css_property_cache.get(property);

  if (cached !== undefined) {
    return cached;
  }

  let result = property;

  if (!property.startsWith("--")) {
    if (/^ms[A-Z]/.test(property)) {
      result = `-${property}`;
    }

    result = result.replace(
      /[A-Z]/g,
      (character) => `-${character.toLowerCase()}`,
    );
  }

  if (css_property_cache.size >= CACHE_LIMIT) {
    css_property_cache.clear();
  }

  css_property_cache.set(property, result);

  return result;
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
  const match = value.match(AT_RULE_NAME_RE);

  if (match === null) {
    return undefined;
  }

  const name = match[0]
    .toLowerCase() as Supported_At_Rule;

  return SUPPORTED_AT_RULES.has(name)
    ? name
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

const selector_split_cache = new Map<string, string[]>();

function split_selector_list(
  selector: string,
): string[] {
  const cached =
    selector_split_cache.get(selector);

  if (cached !== undefined) {
    return cached;
  }

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

  const last = selector.slice(start).trim();

  if (last) {
    result.push(last);
  }

  if (selector_split_cache.size >= CACHE_LIMIT) {
    selector_split_cache.clear();
  }

  selector_split_cache.set(selector, result);

  return result;
}

// FIX: замена "&" с учётом кавычек и экранирования
function substitute_ampersand(
  selector: string,
  replacement: string,
): string {
  if (!selector.includes("&")) {
    return selector;
  }

  let result = "";
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < selector.length; i++) {
    const character = selector[i];

    if (quote !== null) {
      result += character;

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      result += character;
      continue;
    }

    if (character === "\\") {
      result += character + (selector[i + 1] ?? "");
      i++;
      continue;
    }

    result +=
      character === "&" ? replacement : character;
  }

  return result;
}

const selector_resolve_cache = new Map<
  string,
  string
>();

function resolve_selector(
  parent: string,
  nested: string,
): string {
  const cache_key = `${parent}${SEPARATOR}${nested}`;
  const cached =
    selector_resolve_cache.get(cache_key);

  if (cached !== undefined) {
    return cached;
  }

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
          substitute_ampersand(
            nested_selector,
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

  const resolved = result.join(", ");

  if (selector_resolve_cache.size >= CACHE_LIMIT) {
    selector_resolve_cache.clear();
  }

  selector_resolve_cache.set(cache_key, resolved);

  return resolved;
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

// FIX: стабильная сериализация (массивы/объекты) для content-hash
function stable_value(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stable_value).join(",")}]`;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(
      value as Record<string, unknown>,
    ).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return `{${entries
      .map(([key, item]) => `${key}:${stable_value(item)}`)
      .join(",")}}`;
  }

  return String(value);
}

function hash_keyframes(
  keyframes_object: CSS_Object,
): string {
  const parts: string[] = [];

  for (const step of Object.keys(
    keyframes_object,
  ).sort()) {
    const declarations = keyframes_object[step];

    if (!is_nested_object(declarations)) {
      continue;
    }

    parts.push(step);

    for (const prop of Object.keys(
      declarations,
    ).sort()) {
      parts.push(prop, stable_value(declarations[prop]));
    }
  }

  return get_hash(parts.join("|"));
}

// OPT: заменяет регекс rebuild из rewrite_keyframes.
// Имя в keyframes_map -> сразу хэш; иначе -> токен, разрешится во flush.
function bind_animation_names(
  store: CSS_Store,
  value: string,
): string {
  return value.replace(
    ANIMATION_IDENT_RE,
    (ident: string) => {
      const hashed =
        store.keyframes_map.get(ident);

      if (hashed !== undefined) {
        return hashed;
      }

      if (ANIMATION_KEYWORDS.has(ident.toLowerCase())) {
        return ident;
      }

      return `${KF_TOKEN_START}${ident}${KF_TOKEN_END}`;
    },
  );
}

/* ── Эмиссия ───────────────────────────────────────────── */

function emit_declaration(
  store: CSS_Store,
  selector: string,
  at_rules: string[],
  property: string,
  value: CSS_Value,
): CSS_Emitted_Rule | null {
  const css_value = format_value(property, value);

  if (css_value === undefined) {
    return null;
  }

  const css_property = to_css_property(property);

  const final_value =
    property === "animation" ||
    property === "animationName"
      ? bind_animation_names(store, css_value)
      : css_value;

  const declaration =
    `${css_property}:${final_value}`;

  const rule_key = `${at_rules.join(SEPARATOR)}${SEPARATOR}${selector}${SEPARATOR}${declaration}`;

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

  // OPT: хэш считаем только при промахе кэша
  const hash = get_hash(rule_key);
  const class_name = `a${hash}`;

  if (store.class_rule_map.has(class_name)) {
    throw new Error(
      `CSS hash collision: ${class_name}`,
    );
  }

  const class_selector = selector
    ? substitute_ampersand(
        selector,
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

  store.class_map.set(rule_key, class_name);
  store.class_rule_map.set(class_name, rule);

  return { class_name, rule };
}

function emit_keyframes(
  store: CSS_Store,
  at_rule: string,
  original_name: string,
  keyframes_object: CSS_Object,
  at_rules: string[],
): CSS_Emitted_Rule | null {
  const content_hash =
    hash_keyframes(keyframes_object);

  // OPT: дедупликация keyframes с одинаковым телом
  const content_key =
    `${at_rule}${SEPARATOR}${content_hash}`;

  let hashed_name =
    store.keyframes_content_map.get(content_key);

  if (hashed_name === undefined) {
    hashed_name =
      `${original_name}_${content_hash}`;

    store.keyframes_content_map.set(
      content_key,
      hashed_name,
    );
  }

  store.keyframes_map.set(
    original_name,
    hashed_name,
  );

  if (store.keyframes_rule_map.has(hashed_name)) {
    return null;
  }

  const steps: string[] = [];

  for (const [step, declarations] of Object.entries(
    keyframes_object,
  )) {
    if (!is_nested_object(declarations)) {
      continue;
    }

    const step_name = /^\d+$/.test(step)
      ? `${step}%`
      : step;

    const decls: string[] = [];

    for (const [prop, value] of Object.entries(
      declarations,
    )) {
      const css_value = format_value(
        prop,
        value as CSS_Value,
      );

      if (css_value === undefined) {
        continue;
      }

      const final_value =
        prop === "animation" ||
        prop === "animationName"
          ? bind_animation_names(store, css_value)
          : css_value;

      decls.push(
        `${to_css_property(prop)}:${final_value}`,
      );
    }

    steps.push(`${step_name}{${decls.join(";")}}`);
  }

  let rule =
    `${at_rule} ${hashed_name}{${steps.join("")}}`;

  for (let i = at_rules.length - 1; i >= 0; i--) {
    rule = `${at_rules[i]}{${rule}}`;
  }

  store.keyframes_rule_map.set(hashed_name, rule);

  return { class_name: "", rule };
}

// OPT: аккумулятор вместо создания+spread массивов на каждом уровне
function emit_css(
  store: CSS_Store,
  css_object: CSS_Object,
  parent_selector: string,
  at_rules: string[],
  out: CSS_Emitted_Rule[],
): void {
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
          out.push(emitted_rule);
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

      emit_css(
        store,
        value,
        parent_selector,
        [...at_rules, key],
        out,
      );

      continue;
    }

    if (is_nested_object(value)) {
      emit_css(
        store,
        value,
        resolve_selector(parent_selector, key),
        at_rules,
        out,
      );

      continue;
    }

    const emitted_rule = emit_declaration(
      store,
      parent_selector,
      at_rules,
      key,
      value,
    );

    if (emitted_rule !== null) {
      out.push(emitted_rule);
    }
  }
}

/* ── Публичный API ─────────────────────────────────────── */

export function get_emitted_css(
  store: CSS_Store,
): string {
  const parts: string[] = [];

  for (const rule of store.keyframes_rule_map.values()) {
    parts.push(rule);
  }

  for (const rule of store.class_rule_map.values()) {
    parts.push(rule);
  }

  const css_text = parts.join("");

  // FIX: отложенное связывание имён keyframes (forward references)
  return css_text.includes(KF_TOKEN_START)
    ? css_text.replace(
        KF_TOKEN_RE,
        (_match, name: string) =>
          store.keyframes_map.get(name) ?? name,
      )
    : css_text;
}

let flush_scheduled = false;
let style_el: HTMLStyleElement | null = null;
let duplicates_removed = false;

function get_style_el(): HTMLStyleElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  // OPT: querySelectorAll только один раз, а не на каждый флаш
  if (style_el !== null && style_el.isConnected) {
    return style_el;
  }

  const existing =
    document.querySelector<HTMLStyleElement>(
      "style[data-gla]",
    );

  if (existing !== null) {
    style_el = existing;
  } else {
    style_el = document.createElement("style");
    style_el.setAttribute("data-gla", "");
    document.head.appendChild(style_el);
  }

  if (!duplicates_removed) {
    duplicates_removed = true;

    const all =
      document.querySelectorAll<HTMLStyleElement>(
        "style[data-gla]",
      );

    for (const el of all) {
      if (el !== style_el) {
        el.remove();
      }
    }
  }

  return style_el;
}

// OPT: queueMicrotask батчит все css() вызовы тика в одну запись
// https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask
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
  const emitted: CSS_Emitted_Rule[] = [];

  emit_css(store, css_object, "", [], emitted);

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
    .map(
      (emitted_rule) => emitted_rule.class_name,
    )
    .filter(Boolean)
    .join(" ");
}