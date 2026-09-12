"use client";

import {
  ComponentPropsWithoutRef,
  ElementType,
  useInsertionEffect,
} from "react";
import React from "react";

import {
  css_from_store,
  drain_css,
  get_store,
  type CSS_Object,
} from "../css";

const STYLE_TAG_ID = "app-css";

function get_style_tag(): HTMLStyleElement {
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;

  if (tag === null) {
    tag = document.createElement("style");
    tag.id = STYLE_TAG_ID;
    document.head.appendChild(tag);
  }

  return tag;
}

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

  const class_name = css_object
    ? css_from_store(get_store(), css_object)
    : undefined;

  useInsertionEffect(() => {
    const css_text = drain_css(get_store());

    if (css_text) {
      get_style_tag().append(css_text);
    }
  });

  return React.createElement(
    Component,
    {
      ...rest,
      className:
        [class_name, className]
          .filter(Boolean)
          .join(" ") || undefined,
    },
  );
}