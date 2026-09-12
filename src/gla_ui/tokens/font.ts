import type { Size } from "./size";


// Types
type Font_Family = "body" | "heading";
type Font_Value = { size: number; weight: number };
type Font = Record<Size, Font_Value>;
export type Fonts_Name = `${Font_Family}_${Size}`; // export type

type Fonts = Record<Font_Family, Font>;

// Object
export const FONT: Fonts = {
  body: {
    default: { size: 12, weight: 400 },
    xs: { size: 16, weight: 400 },
    sm: { size: 20, weight: 500 },
    md: { size: 28, weight: 500 },
    lg: { size: 32, weight: 600 },
    xl: { size: 36, weight: 600 }
  },
  heading: {
    default: { size: 40, weight: 500 },
    xs: { size: 44, weight: 500 },
    sm: { size: 48, weight: 600 },
    md: { size: 56, weight: 600 },
    lg: { size: 60, weight: 700 },
    xl: { size: 64, weight: 700 }
  }
} as const satisfies Fonts;


// Function
export function get_font(fonts_name: Fonts_Name): Font_Value & { family: Font_Family } {
  let [font_family, font_size_name] = fonts_name.split("_");
  return {
    family: font_family as Font_Family,
    ...FONT[font_family as Font_Family][font_size_name as Size]
  };
}
