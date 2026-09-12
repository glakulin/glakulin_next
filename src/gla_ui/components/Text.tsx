import { ElementType } from "react";
import { get_color, type Colors_Name, type Fonts_Name, get_font } from "../tokens";
import { Default_Props, Box } from ".";

// types
interface Text_Props_Base {
  size?: Fonts_Name;
  mono?: boolean;
  color?: Colors_Name;
}

type Text_Props<T extends ElementType = "span"> = Text_Props_Base & Default_Props<T>;

// Component
export function Text<T extends ElementType = "span">({
  children,
  css,
  tag = "span" as T,

  size = "body_default",
  mono = false, color,

  ...rest
}: Text_Props<T>) {
  let font = get_font(size);

  return (
    <Box {...(rest as any)}
      tag={tag}
      css={{
        fontFamily: mono ? "var(--font-mono)" : `var(--font-${font.family})`,
        fontSize: font.size,
        fontWeight: font.weight,
        color: color ? get_color(color) : undefined,
        lineHeight: "1",
        ...css
      }}>
      {children}
    </Box>
  );
}