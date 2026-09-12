import {
  ComponentPropsWithoutRef,
  ElementType,
} from "react";
import React from "react";

import {
  css_from_store,
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

  const emitted = css_object
    ? css_from_store(store, css_object)
    : [];

  const class_name = emitted.length
    ? emitted
        .map(
          (emitted_rule) =>
            emitted_rule.class_name,
        )
        .join(" ")
    : undefined;

  return React.createElement(
    React.Fragment,
    null,
    emitted.map(
      ({
        class_name: rule_class_name,
        rule,
      }) =>
        React.createElement(
          "style",
          {
            key: rule_class_name,
            href: rule_class_name,
            precedence: STYLE_PRECEDENCE,
          },
          rule,
        ),
    ),
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