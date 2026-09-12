import { ElementType } from "react";
import { Default_Props, Box } from ".";
import Link from "next/link";
import { Colors_Name, get_color } from "../tokens";

// types
interface A_Props_Base {
  color?: Colors_Name;
  color_hover?: Colors_Name;
}

type A_Props<T extends ElementType = typeof Link> = A_Props_Base & Default_Props<T>;

// Component
export function A<T extends ElementType = typeof Link>({
  children,
  tag = Link as unknown as T,
  css,

  color = "gray_1",
  color_hover = "gray_3",

  ...rest
}: A_Props<T>) {

  return (
    <Box {...(rest as Default_Props<T>)}
      tag={tag}
      css={{
        cursor: "pointer",

        color: get_color(color),
        "&:hover": {
          color: get_color(color_hover)
        },

        ...css
      }}
    >
      {children}
    </Box>
  );
}