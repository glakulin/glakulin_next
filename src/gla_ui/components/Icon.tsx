import { get_color, type Colors_Name } from "../tokens";
import { Box } from "./Box";
import { type CSS_Object } from "../css";


// Types
type Icon_Set = "cod" | "custom" | "dev" | "extra" | "fa" | "fae" | "iec" | "indent" | "indentation" | "linux" | "md" | "oct" | "pl" | "ple" | "pom" | "seti" | "weather";
type Icon_Glyph = string;
export type Icon_Name = `nf-${Icon_Set}-${Icon_Glyph}`; // export type


interface Icon_Props {
  name: Icon_Name;
  size?: number;
  color?: Colors_Name;
  css?: CSS_Object;
}


// Component
export function Icon({ 
  name, 
  size, 
  color, 
  css,
  ...rest 
}: Icon_Props) {
  return (
    <Box {...rest}
      tag="i" 
      className={`nf ${name} transition`} 
      css={{
        fontSize: size,
        color: color ? get_color(color) : undefined,
        ...css
    }} ></Box>
  );
}
