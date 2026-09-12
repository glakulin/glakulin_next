// Types
type Color_Name = "gray" | "accent" | "info" | "error" | "success" | "warning";
type Color_Shade = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Color_Value = `#${string}`;
type Color = Record<Color_Shade, Color_Value>;

type Colors = Record<Color_Name, Color>;
export type Colors_Name = `${Color_Name}_${Color_Shade}`; // export type


// Object
export const COLORS: Colors = {
  gray: {
    "1": "#FFFFFF",
    "2": "#DFDFDF",
    "3": "#BFBFBF",
    "4": "#9F9F9F",
    "5": "#808080",
    "6": "#606060",
    "7": "#404040",
    "8": "#202020",
    "9": "#000000"
  },
  accent: {
    "1": "#F4E5FF",
    "2": "#E4BFFF",
    "3": "#CA80FF",
    "4": "#AF40FF",
    "5": "#9500FF",
    "6": "#7000BF",
    "7": "#4A0080",
    "8": "#250040",
    "9": "#0F001A"
  },

  info: {
    "1": "#E5EEFF",
    "2": "#BFD4FF",
    "3": "#80AAFF",
    "4": "#4080FF",
    "5": "#0055FF",
    "6": "#0040BF",
    "7": "#002B80",
    "8": "#001540",
    "9": "#00091A"
  },
  error: {
    "1": "#FFE9E5",
    "2": "#FFC8BF",
    "3": "#FF9080",
    "4": "#FF5940",
    "5": "#FF2200",
    "6": "#BF1A00",
    "7": "#801100",
    "8": "#400900",
    "9": "#1A0300"
  },
  success: {
    "1": "#EEFFE5",
    "2": "#D4FFBF",
    "3": "#AAFF80",
    "4": "#80FF40",
    "5": "#55FF00",
    "6": "#40BF00",
    "7": "#2B8000",
    "8": "#154000",
    "9": "#091A00"
  },
  warning: {
    "1": "#FFFBE5",
    "2": "#FFF4BF",
    "3": "#FFEA80",
    "4": "#FFDF40",
    "5": "#FFD400",
    "6": "#BF9F00",
    "7": "#806A00",
    "8": "#403500",
    "9": "#1A1500"
  }
} as const satisfies Colors;


// Function
export function get_color(colors_name: Colors_Name): Color_Value {
  let [color_name, color_shade] = colors_name.split("_");
  return COLORS[color_name as Color_Name][color_shade as Color_Shade];
}