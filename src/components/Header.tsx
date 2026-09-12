"use client"

import { Flex, Text, get_screen_padding } from "@/gla_ui";

export function Header() {
  return (<>
    <Flex tag="header"
      css={{
        position: "fixed",
        ...get_screen_padding()
      }}
    >
    </Flex>
  </>);
}