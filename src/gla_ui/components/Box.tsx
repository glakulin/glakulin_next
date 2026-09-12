import {
  ComponentPropsWithoutRef,
  ElementType,
} from "react";
import React from "react";

import {
  css_from_store,
  get_css_for_classes,
  get_hash,
  get_store,
  type CSS_Object,
} from "../css";

const STYLE_PRECEDENCE = "app";

type Box_Props<
  T extends ElementType = "div",
> = {
  tag?: T;
  css?: CSS_Object;
} & ComponentPropsWithoutRef<T>;

export function Box<
  T extends ElementType = "div",
>({
  tag,
  css: css_object,
  className,
  ...rest
}: Box_Props<T>) {
  const Component = tag ?? "div";

  const store = get_store();

  const class_name = css_object
    ? css_from_store(store, css_object)
    : undefined;

  const css_text = class_name
    ? get_css_for_classes(store, class_name)
    : "";

  return React.createElement(
    React.Fragment,
    null,
    css_text
      ? React.createElement(
          "style",
          {
            href: `app-css-${get_hash(css_text)}`,
            precedence: STYLE_PRECEDENCE,
          },
          css_text,
        )
      : null,
    React.createElement(
      Component,
      {
        ...rest,
        className:
          [class_name, className]
            .filter(Boolean)
            .join(" ") || undefined,
      },
    ),
  );
}