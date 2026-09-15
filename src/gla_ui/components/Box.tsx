import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
} from "react";

import { css_from_store, get_store, type CSS_Object } from "../css";

type Box_Props<T extends ElementType = "div"> = {
  tag?: T;
  css?: CSS_Object;
} & ComponentPropsWithoutRef<T>;

export function Box<T extends ElementType = "div">({
  tag,
  css: css_object,
  className,
  ...rest
}: Box_Props<T>) {
  const Component = tag ?? "div";
  const store = get_store();

  const emitted = css_object ? css_from_store(store, css_object) : [];

  const class_name = emitted.length
    ? emitted
        .filter((rule) => rule.class_name)
        .map((rule) => rule.class_name)
        .join(" ")
    : undefined;

  return React.createElement(Component, {
    ...rest,
    className: [class_name, className].filter(Boolean).join(" ") || undefined,
  });
}