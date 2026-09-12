import { CSSProperties, ElementType } from "react";
import { Default_Props, Box } from ".";
import { Layout_Props_Base, get_layout_css } from "./layout";

// types
interface Flex_Props_Base extends Layout_Props_Base {
  inline?: boolean;

  direction?: CSSProperties["flexDirection"];
  wrap?: CSSProperties["flexWrap"];
}

type Flex_Props<T extends ElementType = "div"> = Flex_Props_Base & Default_Props<T>;

// Component
export function Flex<T extends ElementType = "div">({
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

  direction = "row",
  wrap = "nowrap",

  ...rest
}: Flex_Props<T>) {
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
        display: inline ? "inline-flex" : "flex",

        ...layout_css,

        flexDirection: direction,
        flexWrap: wrap,

        ...css,
      }}
    >
      {children}
    </Box>
  );
}