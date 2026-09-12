"use client";

import { Flex, A, get_screen_padding, Text, Icon, get_color, Icon_Name } from "@/gla_ui";
import { Logo, Logo_Links } from ".";
import { useEffect, useState } from "react";

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

const PAGES: { name: string; href: string; icon: Icon_Name }[] = [
  { name: "Donate", href: "/donate", icon: "nf-fa-hand_holding_dollar" },
];

function Menu({ closing, on_closed }: { closing: boolean; on_closed: () => void }) {
  return (
    <Flex
      tag="nav"
      css={{
        position: "absolute",
        width: "100%",
        marginTop: 52,
        left: 0,
        ...get_screen_padding(),
        transformOrigin: "top right",

        animation: closing
          ? "menuOut 150ms ease-in forwards"
          : "menuIn 180ms cubic-bezier(0.16, 1, 0.3, 1)",

        "@keyframes menuIn": {
          from: { opacity: 0, transform: "translateY(-8px) scale(0.96)" },
          to:   { opacity: 1, transform: "translateY(0)   scale(1)" },
        },
        "@keyframes menuOut": {
          from: { opacity: 1, transform: "translateY(0)   scale(1)" },
          to:   { opacity: 0, transform: "translateY(-8px) scale(0.96)" },
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
          border: `2px solid ${get_color("gray_8")}`,
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
          ...get_screen_padding(),
        }}
      >
        <Flex
          align_items="center"
          justify_content="space-between"
          padding={[8, 16]}
          css={{
            width: "100%",
            border: `2px solid ${get_color("gray_8")}`,
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