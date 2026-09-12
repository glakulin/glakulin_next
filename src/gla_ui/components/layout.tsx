import { CSSProperties } from "react";
import { Rem_Map } from "../tokens";
import { CSS_Object } from "../css";

// types
export interface Layout_Props_Base {
  padding?: Rem_Map;
  gap?: Rem_Map;
  radius?: Rem_Map;

  align_items?: CSSProperties["alignItems"];
  align_content?: CSSProperties["alignContent"];
  justify_items?: CSSProperties["justifyItems"];
  justify_content?: CSSProperties["justifyContent"];
}

export const LAYOUT_PROP_KEYS = [
  "padding",
  "gap",
  "radius",
  "align_items",
  "align_content",
  "justify_items",
  "justify_content",
] as const satisfies readonly (keyof Layout_Props_Base)[];

// собирает CSS_Object из общих layout-пропсов — переиспользуется в Flex и Grid
export function get_layout_css(props: Layout_Props_Base): CSS_Object {
  return {
    padding: props.padding,
    gap: props.gap,
    borderRadius: props.radius,

    alignItems: props.align_items,
    alignContent: props.align_content,
    justifyItems: props.justify_items,
    justifyContent: props.justify_content,
  };
}