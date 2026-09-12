import type { CSS_Object } from "@/ui/css";

// Types
export type Size = "default" | "xs" | "sm" | "md" | "lg" | "xl"; // export type
type Size_Value = Record<Size, number>;
type Group_Name = "screen" | "screen_padding";
export type Sizes_Name = `${Group_Name}_${Size}`; // export type

type Sizes = Record<Group_Name, Size_Value>;


// Object
export const SIZE: Sizes = {
  screen: {
    default:  390,
    xs: 576,
    sm: 768,
    md: 1024,
    lg: 1440,
    xl: 1920
  },
  screen_padding: {
    default:  8,
    xs: 16,
    sm: 32,
    md: 64,
    lg: 128,
    xl: 256
  }
} as const satisfies Sizes;


// Function
export function get_size(sizes_name: Sizes_Name): number {
  let at = sizes_name.lastIndexOf("_");
  let group_name = sizes_name.slice(0, at) as Group_Name;
  let size_name = sizes_name.slice(at + 1) as Size;
  return SIZE[group_name][size_name];
}

// screen_padding
export function get_screen_padding(): CSS_Object {
  let css_object: Record<string, CSS_Object | number> = { paddingInline: get_size("screen_padding_default") };
  for (let size_name of Object.keys(SIZE.screen) as Size[]) {
    if (size_name !== "default") {
      css_object[`@media (min-width: ${SIZE.screen[size_name]}px)`] = {
        padding: [0, get_size(`screen_padding_${size_name}`)],
      };
    }
  }
  return css_object as CSS_Object;
}