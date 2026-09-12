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
    | number
    | number[]
    | null;
} & {
  [key: `--${string}`]: CSS_Value;
} & {
  [key: string]: CSS_Value | CSS_Object;
};

type CSS_Store = {
  class_map: Map<string, string>;
  class_rule_map: Map<string, string>;
  css_buffer: string[];
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

const get_store = cache(
  (): CSS_Store => ({
    class_map: new Map(),
    class_rule_map: new Map(),
    css_buffer: [],
  }),
);

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

function emit_declaration(
  store: CSS_Store,
  selector: string,
  at_rules: string[],
  property: string,
  value: CSS_Value,
): string {
  const css_property =
    to_css_property(property);

  const css_value =
    format_value(property, value);

  if (css_value === undefined) {
    return "";
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

  const previous_rule =
    store.class_rule_map.get(class_name);

  if (
    previous_rule !== undefined &&
    previous_rule !== rule_key
  ) {
    throw new Error(
      `CSS hash collision: ${class_name}`,
    );
  }

  store.class_rule_map.set(
    class_name,
    rule_key,
  );

  const existing_class =
    store.class_map.get(rule_key);

  if (existing_class !== undefined) {
    return existing_class;
  }

  store.class_map.set(
    rule_key,
    class_name,
  );

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

  store.css_buffer.push(rule);

  return class_name;
}

function emit_css(
  store: CSS_Store,
  css_object: CSS_Object,
  parent_selector = "",
  at_rules: string[] = [],
): string[] {
  const classes: string[] = [];

  for (const [key, value] of Object.entries(
    css_object,
  )) {
    if (value == null) {
      continue;
    }

    if (key.startsWith("@")) {
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

      classes.push(
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

      classes.push(
        ...emit_css(
          store,
          value,
          selector,
          at_rules,
        ),
      );

      continue;
    }

    const class_name =
      emit_declaration(
        store,
        parent_selector,
        at_rules,
        key,
        value,
      );

    if (class_name) {
      classes.push(class_name);
    }
  }

  return classes;
}

export function css(
  css_object: CSS_Object,
): string {
  const store = get_store();

  return emit_css(
    store,
    css_object,
  ).join(" ");
}

export function get_css(): string {
  const store = get_store();

  const css_text =
    store.css_buffer.join("");

  store.css_buffer.length = 0;

  return css_text;
}