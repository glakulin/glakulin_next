import { CSSProperties, ElementType } from "react";
import { Default_Props, Box } from ".";
import { Layout_Props_Base, get_layout_css } from "./layout";

// types
interface Grid_Props_Base extends Layout_Props_Base {
  inline?: boolean;

  template_columns?: CSSProperties["gridTemplateColumns"];
  template_rows?: CSSProperties["gridTemplateRows"];
  template_areas?: CSSProperties["gridTemplateAreas"];
  auto_flow?: CSSProperties["gridAutoFlow"];
  place_items?: CSSProperties["placeItems"];
  place_content?: CSSProperties["placeContent"];
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

  template_columns,
  template_rows,
  template_areas,
  auto_flow,
  place_items,
  place_content,

  ...rest
}: Grid_Props<T>) {
  const layout_css = get_layout_css({
    padding,
    gap,
    radius,
    align_items,
    align_content,
    justify_items,
    justify_content,
  });

  return (
    <Box {...(rest as Default_Props<T>)}
      tag={tag}
      css={{
        display: inline ? "inline-grid" : "grid",

        ...layout_css,

        gridTemplateColumns: template_columns,
        gridTemplateRows: template_rows,
        gridTemplateAreas: template_areas,
        gridAutoFlow: auto_flow,
        placeItems: place_items,
        placeContent: place_content,

        ...css,
      }}
    >
      {children}
    </Box>
  );
}