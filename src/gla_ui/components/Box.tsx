import {
  css,
  get_css,
  type CSS_Object,
} from "../css";

import type {
  ComponentPropsWithoutRef,
  ElementType,
} from "react";

import React from "react";

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

  if (css_object === undefined) {
    return React.createElement(
      Component,
      {
        ...rest,
        className,
      },
    );
  }

  const class_name = css(css_object);
  const css_text = get_css();

  return (
    <>
      {css_text ? (
        <style precedence="atomic">
          {css_text}
        </style>
      ) : null}

      {React.createElement(
        Component,
        {
          ...rest,
          className:
            [class_name, className]
              .filter(Boolean)
              .join(" ") || undefined,
        },
      )}
    </>
  );
}