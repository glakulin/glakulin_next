import { type CSS_Object } from "../css";
import { ComponentPropsWithoutRef, ElementType } from "react";


export { Box } from "./Box";
export { Icon, type Icon_Name } from "./Icon";
export { Text } from "./Text";
export { Flex } from "./Flex";
export { Grid } from "./Grid";
export { A } from "./A";


export type Default_Props<T extends ElementType = "div"> = {
  css?: CSS_Object;
  children?: React.ReactNode;
  tag?: T;
} & ComponentPropsWithoutRef<T>;