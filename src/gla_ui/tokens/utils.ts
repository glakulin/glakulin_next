// types
export type Rem_Map = number | (number | string)[];

// px to rem
export function get_rem(value: number): string {
  return `${value * 0.0625}rem`
}

// mapping function
export function map_rem(value: Rem_Map): string {
  return typeof value === "number"
    ? get_rem(value)
    : value.map((i) => (typeof i === "number" ? get_rem(i) : i)).join(" ");
}