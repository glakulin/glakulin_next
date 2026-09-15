import { cache } from "react";
import type { CSSProperties } from "react";

import { get_rem, map_rem, type Rem_Map } from "./tokens";

/* ════════════════════════════════════════════════════════
   Типы
   ════════════════════════════════════════════════════════ */

export type CSS_Value =
  | Rem_Map
  | string
  | number
  | number[]
  | null
  | undefined;

export type CSS_Object = {
  [K in keyof CSSProperties]?: CSSProperties[K] | CSS_Value;
} & {
  [key: `--${string}`]: CSS_Value;
} & {
  [key: string]: CSS_Value | CSS_Object;
};

// Слой каскада. React `precedence` гарантирует: более поздний
// precedence переопределяет более ранний — независимо от того,
// какой компонент дерева отрендерился раньше. Поэтому пересекающиеся
// свойства (base vs :hover, base vs @media) должны жить в разных
// слоях, а не полагаться на порядок рендера/вставки.
export type CSS_Rule_Kind = "base" | "variant" | "media";

export type CSS_Emitted_Rule = {
  class_name: string;
  rule: string;
  kind: CSS_Rule_Kind;
};

export type CSS_Store = {
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

/* ════════════════════════════════════════════════════════
   Store — per-request на сервере (cache()), синглтон на клиенте.
   ════════════════════════════════════════════════════════ */

const get_server_store = cache(create_store);
let client_store: CSS_Store | null = null;

export function get_store(): CSS_Store {
  if (typeof window === "undefined") return get_server_store();
  if (client_store === null) client_store = create_store();
  return client_store;
}

/* ════════════════════════════════════════════════════════
   Константы движка
   ════════════════════════════════════════════════════════ */

const CSS_UNITLESS = new Set([
  "animationIterationCount", "aspectRatio", "borderImageOutset",
  "borderImageSlice", "borderImageWidth", "boxFlex", "boxFlexGroup",
  "boxOrdinalGroup", "columnCount", "columns", "flex", "flexGrow",
  "flexPositive", "flexShrink", "flexNegative", "flexOrder", "fontWeight",
  "gridArea", "gridColumn", "gridColumnEnd", "gridColumnStart", "gridRow",
  "gridRowEnd", "gridRowStart", "lineClamp", "lineHeight", "opacity",
  "order", "orphans", "scale", "tabSize", "widows", "zoom", "zIndex",
  "fillOpacity", "floodOpacity", "stopOpacity", "strokeDasharray",
  "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth",
]);

const SUPPORTED_AT_RULE_LIST = [
  "@media", "@supports", "@container", "@layer", "@scope", "@starting-style",
] as const;
type Supported_At_Rule = (typeof SUPPORTED_AT_RULE_LIST)[number];
const SUPPORTED_AT_RULES = new Set<Supported_At_Rule>(SUPPORTED_AT_RULE_LIST);

const KEYFRAMES_RE = /^(@(?:-webkit-)?keyframes)\s+(.+?)\s*$/i;
const AT_RULE_NAME_RE = /^@[a-zA-Z-]+/;

const ANIMATION_IDENT_RE =
  /(?<![\p{L}\p{N}_-])([\p{L}_][\p{L}\p{N}_-]*)(?![\p{L}\p{N}_-])(?!\()/gu;

const ANIMATION_KEYWORDS = new Set([
  "none", "normal", "reverse", "alternate", "alternate-reverse", "infinite",
  "ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start",
  "step-end", "forwards", "backwards", "both", "running", "paused",
  "jump-start", "jump-end", "jump-none", "jump-both", "initial", "inherit",
  "unset", "revert", "revert-layer",
]);

const KF_TOKEN_START = "\uE000";
const KF_TOKEN_END = "\uE001";
const SEPARATOR = "\u0001";
const CACHE_LIMIT = 1000;

/* ════════════════════════════════════════════════════════
   Утилиты движка
   ════════════════════════════════════════════════════════ */

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
  if (cached !== undefined) return cached;

  let result = property;
  if (!property.startsWith("--")) {
    if (/^ms[A-Z]/.test(property)) result = `-${property}`;
    result = result.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  }

  if (css_property_cache.size >= CACHE_LIMIT) css_property_cache.clear();
  css_property_cache.set(property, result);
  return result;
}

function is_unitless_property(property: string): boolean {
  if (CSS_UNITLESS.has(property)) return true;
  const vendor_match = property.match(/^(Webkit|Moz|ms|O)(.+)$/);
  return vendor_match ? CSS_UNITLESS.has(vendor_match[2]) : false;
}

function is_nested_object(value: unknown): value is CSS_Object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function get_at_rule_name(value: string): Supported_At_Rule | undefined {
  const match = value.match(AT_RULE_NAME_RE);
  if (match === null) return undefined;
  const name = match[0].toLowerCase() as Supported_At_Rule;
  return SUPPORTED_AT_RULES.has(name) ? name : undefined;
}

function get_keyframes_name(
  key: string,
): { at_rule: string; name: string } | null {
  const match = key.match(KEYFRAMES_RE);
  return match === null ? null : { at_rule: match[1], name: match[2] };
}

function get_rule_kind(selector: string, at_rules: string[]): CSS_Rule_Kind {
  if (at_rules.length > 0) return "media";
  if (selector) return "variant";
  return "base";
}

const selector_split_cache = new Map<string, string[]>();

function split_selector_list(selector: string): string[] {
  const cached = selector_split_cache.get(selector);
  if (cached !== undefined) return cached;

  const result: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (let i = 0; i < selector.length; i++) {
    const character = selector[i];
    if (escaped) { escaped = false; continue; }
    if (character === "\\") { escaped = true; continue; }
    if (quote !== null) { if (character === quote) quote = null; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === "(") { parentheses++; continue; }
    if (character === ")") { parentheses = Math.max(0, parentheses - 1); continue; }
    if (character === "[") { brackets++; continue; }
    if (character === "]") { brackets = Math.max(0, brackets - 1); continue; }
    if (character === "," && parentheses === 0 && brackets === 0) {
      const part = selector.slice(start, i).trim();
      if (part) result.push(part);
      start = i + 1;
    }
  }

  const last = selector.slice(start).trim();
  if (last) result.push(last);

  if (selector_split_cache.size >= CACHE_LIMIT) selector_split_cache.clear();
  selector_split_cache.set(selector, result);
  return result;
}

function substitute_ampersand(selector: string, replacement: string): string {
  if (!selector.includes("&")) return selector;

  let result = "";
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < selector.length; i++) {
    const character = selector[i];
    if (quote !== null) {
      result += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; result += character; continue; }
    if (character === "\\") { result += character + (selector[i + 1] ?? ""); i++; continue; }
    result += character === "&" ? replacement : character;
  }

  return result;
}

const selector_resolve_cache = new Map<string, string>();

function resolve_selector(parent: string, nested: string): string {
  const cache_key = `${parent}${SEPARATOR}${nested}`;
  const cached = selector_resolve_cache.get(cache_key);
  if (cached !== undefined) return cached;

  const parents = parent ? split_selector_list(parent) : ["&"];
  const nested_selectors = split_selector_list(nested);
  const result: string[] = [];

  for (const parent_selector of parents) {
    for (const nested_selector of nested_selectors) {
      if (nested_selector.includes("&")) {
        result.push(substitute_ampersand(nested_selector, parent_selector));
        continue;
      }
      if (/^[>+~:[(]/.test(nested_selector)) {
        result.push(`${parent_selector}${nested_selector}`);
        continue;
      }
      result.push(`${parent_selector} ${nested_selector}`);
    }
  }

  const resolved = result.join(", ");
  if (selector_resolve_cache.size >= CACHE_LIMIT) selector_resolve_cache.clear();
  selector_resolve_cache.set(cache_key, resolved);
  return resolved;
}

function format_value(property: string, value: CSS_Value): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return is_unitless_property(property) ? value.join(" ") : map_rem(value);
  }
  if (typeof value === "number") {
    return is_unitless_property(property) ? String(value) : get_rem(value);
  }
  return String(value);
}

function stable_value(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable_value).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
    );
    return `{${entries.map(([k, v]) => `${k}:${stable_value(v)}`).join(",")}}`;
  }
  return String(value);
}

function hash_keyframes(keyframes_object: CSS_Object): string {
  const parts: string[] = [];
  for (const step of Object.keys(keyframes_object).sort()) {
    const declarations = keyframes_object[step];
    if (!is_nested_object(declarations)) continue;
    parts.push(step);
    for (const prop of Object.keys(declarations).sort()) {
      parts.push(prop, stable_value(declarations[prop]));
    }
  }
  return get_hash(parts.join("|"));
}

function bind_animation_names(store: CSS_Store, value: string): string {
  return value.replace(ANIMATION_IDENT_RE, (ident: string) => {
    const hashed = store.keyframes_map.get(ident);
    if (hashed !== undefined) return hashed;
    if (ANIMATION_KEYWORDS.has(ident.toLowerCase())) return ident;
    return `${KF_TOKEN_START}${ident}${KF_TOKEN_END}`;
  });
}

/* ════════════════════════════════════════════════════════
   Эмиссия
   ════════════════════════════════════════════════════════ */

function emit_declaration(
  store: CSS_Store,
  selector: string,
  at_rules: string[],
  property: string,
  value: CSS_Value,
): CSS_Emitted_Rule | null {
  const css_value = format_value(property, value);
  if (css_value === undefined) return null;

  const css_property = to_css_property(property);
  const final_value =
    property === "animation" || property === "animationName"
      ? bind_animation_names(store, css_value)
      : css_value;

  const declaration = `${css_property}:${final_value}`;
  const rule_key = `${at_rules.join(SEPARATOR)}${SEPARATOR}${selector}${SEPARATOR}${declaration}`;
  const kind = get_rule_kind(selector, at_rules);

  const existing_class = store.class_map.get(rule_key);
  if (existing_class !== undefined) {
    return {
      class_name: existing_class,
      rule: store.class_rule_map.get(existing_class)!,
      kind,
    };
  }

  const hash = get_hash(rule_key);
  const class_name = `a${hash}`;

  if (store.class_rule_map.has(class_name)) {
    throw new Error(`CSS hash collision: ${class_name}`);
  }

  const class_selector = selector
    ? substitute_ampersand(selector, `.${class_name}`)
    : `.${class_name}`;

  let rule = `${class_selector}{${declaration}}`;
  for (let i = at_rules.length - 1; i >= 0; i--) rule = `${at_rules[i]}{${rule}}`;

  store.class_map.set(rule_key, class_name);
  store.class_rule_map.set(class_name, rule);
  schedule_client_flush(rule);

  return { class_name, rule, kind };
}

function emit_keyframes(
  store: CSS_Store,
  at_rule: string,
  original_name: string,
  keyframes_object: CSS_Object,
  at_rules: string[],
): CSS_Emitted_Rule | null {
  const content_hash = hash_keyframes(keyframes_object);
  const content_key = `${at_rule}${SEPARATOR}${content_hash}`;

  let hashed_name = store.keyframes_content_map.get(content_key);
  if (hashed_name === undefined) {
    hashed_name = `${original_name}_${content_hash}`;
    store.keyframes_content_map.set(content_key, hashed_name);
  }

  store.keyframes_map.set(original_name, hashed_name);
  if (store.keyframes_rule_map.has(hashed_name)) return null;

  const steps: string[] = [];
  for (const [step, declarations] of Object.entries(keyframes_object)) {
    if (!is_nested_object(declarations)) continue;
    const step_name = /^\d+$/.test(step) ? `${step}%` : step;
    const decls: string[] = [];
    for (const [prop, value] of Object.entries(declarations)) {
      const css_value = format_value(prop, value as CSS_Value);
      if (css_value === undefined) continue;
      const final_value =
        prop === "animation" || prop === "animationName"
          ? bind_animation_names(store, css_value)
          : css_value;
      decls.push(`${to_css_property(prop)}:${final_value}`);
    }
    steps.push(`${step_name}{${decls.join(";")}}`);
  }

  let rule = `${at_rule} ${hashed_name}{${steps.join("")}}`;
  for (let i = at_rules.length - 1; i >= 0; i--) rule = `${at_rules[i]}{${rule}}`;

  store.keyframes_rule_map.set(hashed_name, rule);
  schedule_client_flush(rule);

  // keyframes не конкурируют по свойствам ни с чем — слой не
  // влияет на каскад, кладём условно в "media".
  return { class_name: "", rule, kind: "media" };
}

function emit_css(
  store: CSS_Store,
  css_object: CSS_Object,
  parent_selector: string,
  at_rules: string[],
  out: CSS_Emitted_Rule[],
): void {
  for (const [key, value] of Object.entries(css_object)) {
    if (value == null) continue;

    if (key.startsWith("@")) {
      const kf = get_keyframes_name(key);
      if (kf !== null) {
        if (!is_nested_object(value)) {
          throw new Error(`@keyframes must contain a CSS object: ${key}`);
        }
        const emitted_rule = emit_keyframes(store, kf.at_rule, kf.name, value, at_rules);
        if (emitted_rule !== null) out.push(emitted_rule);
        continue;
      }

      const at_rule_name = get_at_rule_name(key);
      if (at_rule_name === undefined) throw new Error(`Unsupported at-rule: ${key}`);
      if (!is_nested_object(value)) throw new Error(`At-rule must contain a CSS object: ${key}`);

      emit_css(store, value, parent_selector, [...at_rules, key], out);
      continue;
    }

    if (is_nested_object(value)) {
      emit_css(store, value, resolve_selector(parent_selector, key), at_rules, out);
      continue;
    }

    const emitted_rule = emit_declaration(store, parent_selector, at_rules, key, value);
    if (emitted_rule !== null) out.push(emitted_rule);
  }
}

export function css_from_store(
  store: CSS_Store,
  css_object: CSS_Object,
): CSS_Emitted_Rule[] {
  const emitted: CSS_Emitted_Rule[] = [];
  emit_css(store, css_object, "", [], emitted);
  return emitted;
}

/* ════════════════════════════════════════════════════════
   Клиентский флаш — один физический <style> тег на всё
   приложение. Новые правила ДОПИСЫВАЮТСЯ в его textContent,
   тег не пересоздаётся. Вызывается прямо из emit_declaration/
   emit_keyframes в момент регистрации правила — то есть
   срабатывает независимо от того, какой компонент сейчас
   рендерится (Header, Menu, что угодно), а не только когда
   рендерится какой-то один конкретный "стилевой" компонент.
   queueMicrotask батчит все правила одного тика в одну запись.
   ════════════════════════════════════════════════════════ */

let pending_css: string[] = [];
let flush_scheduled = false;
let style_el: HTMLStyleElement | null = null;

function get_style_el(): HTMLStyleElement {
  if (style_el !== null && style_el.isConnected) return style_el;

  const existing = document.querySelector<HTMLStyleElement>("style[data-gla]");
  if (existing !== null) {
    style_el = existing;
  } else {
    style_el = document.createElement("style");
    style_el.setAttribute("data-gla", "");
    document.head.appendChild(style_el);
  }

  return style_el;
}

function schedule_client_flush(rule: string): void {
  if (typeof window === "undefined") return;

  pending_css.push(rule);
  if (flush_scheduled) return;
  flush_scheduled = true;

  queueMicrotask(() => {
    flush_scheduled = false;
    const text = pending_css.join("");
    pending_css = [];
    if (text) get_style_el().textContent += text;
  });
}

// Всё, что накопилось в store целиком — для первого SSR-флаша,
// который отдаёт весь CSS запроса одним куском в HTML.
export function get_all_css(store: CSS_Store): string {
  return [
    ...store.keyframes_rule_map.values(),
    ...store.class_rule_map.values(),
  ].join("");
}

/* ════════════════════════════════════════════════════════
   Публичная точка входа
   ════════════════════════════════════════════════════════ */

export function css(css_object: CSS_Object): CSS_Emitted_Rule[] {
  return css_from_store(get_store(), css_object);
}