import { CSSProperties, ElementType } from "react";
import { Default_Props, Box } from ".";
import { Rem_Map } from "../tokens";

// types
interface Grid_Props_Base {
  inline?: boolean;

  padding?: Rem_Map;
  gap?: Rem_Map;
  radius?: Rem_Map;

  align_items?: CSSProperties["alignItems"];
  align_content?: CSSProperties["alignContent"];
  justify_items?: CSSProperties["justifyItems"];
  justify_content?: CSSProperties["justifyContent"];

  templateColumns?: CSSProperties["gridTemplateColumns"];
  templateRows?: CSSProperties["gridTemplateRows"];
  templateAreas?: CSSProperties["gridTemplateAreas"];
  autoFlow?: CSSProperties["gridAutoFlow"];
  placeItems?: CSSProperties["placeItems"];
  placeContent?: CSSProperties["placeContent"];
}

type Grid_Props<T extends ElementType = "div"> = Grid_Props_Base & Default_Props<T>;

// Component
export function Grid<T extends ElementType = "div">({
  children,
  tag = "div" as T,
  css,

  inline = false,

  padding,
  gap,
  radius,

  align_items,
  align_content,
  justify_items,
  justify_content,

  templateColumns,
  templateRows,
  templateAreas,
  autoFlow,
  placeItems,
  placeContent,

  ...rest
}: Grid_Props<T>) {
  return (
    <Box {...(rest as any)}
      tag={tag}
      css={{
        display: inline ? "inline-grid" : "grid",

        padding: padding,
        gap: gap,
        borderRadius: radius,

        alignItems: align_items,
        alignContent: align_content,
        justifyItems: justify_items,
        justifyContent: justify_content,

        gridTemplateColumns: templateColumns,
        gridTemplateRows: templateRows,
        gridTemplateAreas: templateAreas,
        gridAutoFlow: autoFlow,
        placeItems: placeItems,
        placeContent: placeContent,

        ...css,
      }}
    >
      {children}
    </Box>
  );
}