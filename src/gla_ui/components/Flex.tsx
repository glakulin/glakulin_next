import { CSSProperties, ElementType } from "react";
import { Default_Props, Box} from ".";
import { Rem_Map } from "../tokens";

// types
interface Flex_Props_Base {
  inline?: boolean;

  padding?: Rem_Map;
  gap?: Rem_Map;
  radius?: Rem_Map;
  
  align_items?: CSSProperties["alignItems"];
  align_content?: CSSProperties["alignContent"];
  justify_items?: CSSProperties["justifyItems"];
  justify_content?: CSSProperties["justifyContent"];

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
  return (
    <Box {...(rest as any)}
      tag={tag}
      css={{
        display: inline ? "inline-flex" : "flex",

        padding: padding,
        gap: gap,
        borderRadius: radius,

        alignItems: align_items,
        alignContent: align_content,
        justifyItems: justify_items,
        justifyContent: justify_content,

        flexDirection: direction,
        flexWrap: wrap,
        
        ...css,
      }}
    >
      {children}
    </Box>
  );
}