"use client";

import { Flex, A, get_screen_padding, Text, Icon, get_color, Icon_Name } from "@/gla_ui";
import { Logo, Logo_Links, PAGES } from ".";
import { useEffect, useState } from "react";
import { CSS_Object } from "@/gla_ui/css";

export function Glinks() {
  return (
    <A href={"https://glakulinks.vercel.app/"} target="_blank" rel="noopener noreferrer">
      <Text size="body_xs">
        <Flex gap={4}>
          <Logo_Links />links
        </Flex>
      </Text>
    </A>
  );
}

let back_style: CSS_Object = {
  border: `2px solid ${get_color("gray_8")}`,
  backgroundColor: get_color("gray_9")
}

function Menu({ closing, on_closed }: { closing: boolean; on_closed: () => void }) {
  return (
    <Flex
      tag="nav"
      css={{
        position: "absolute",
        width: "100%",
        marginTop: 60,
        left: 0,
        ...get_screen_padding(),
        transformOrigin: "top",

        animation: closing
          ? "menuOut .333s ease-out forwards"
          : "menuIn .333s ease-out forwards",

        "@keyframes menuIn": {
          from: { transform: "scaleY(0)" },
          to:   { transform: "scaleY(1)" },
        },
        "@keyframes menuOut": {
          from: { transform: "scaleY(1)" },
          to:   { transform: "scaleY(0)" },
        },
      }}
      onAnimationEnd={closing ? on_closed : undefined}
    >
      <Flex
        direction="column"
        gap={8}
        padding={8}
        css={{
          width: "100%",
          ...back_style
        }}
      >
        <Glinks />
        {PAGES.map((page) => (
          <A key={page.name} href={page.href}>
            <Text size="body_xs">
              <Flex gap={4}>
                <Icon name={page.icon} />
                {page.name}
              </Flex>
            </Text>
          </A>
        ))}
      </Flex>
    </Flex>
  );
}

export function Header() {
  const [menu_open, set_menu_open] = useState(false);
  const [menu_visible, set_menu_visible] = useState(false);

  useEffect(() => {
    if (menu_open) set_menu_visible(true);
  }, [menu_open]);

  return (
    <>
      <Flex
        tag="header"
        css={{
          position: "fixed",
          width: "100%",

          marginTop: 16,
          ...get_screen_padding()
        }}
      >
        <Flex
          align_items="center"
          justify_content="space-between"
          padding={[8, 16]}
          css={{
            width: "100%",
            ...back_style
          }}
        >
          <A href={"/"}>
            <Text size="body_md">
              <Logo />
            </Text>
          </A>
          <A tag="span" onClick={() => set_menu_open((v) => !v)}>
            <Icon size={20} name={menu_open ? "nf-md-close" : "nf-md-menu"} />
          </A>
        </Flex>

        {menu_visible && (
          <Menu
            closing={!menu_open}
            on_closed={() => set_menu_visible(false)}
          />
        )}
      </Flex>
    </>
  );
}