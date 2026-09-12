import { Flex, A, get_screen_padding, Text } from "@/gla_ui";
import { Logo, Logo_Links } from ".";

export function Glinks() {
  return (
    <A href={"https://glakulinks.vercel.app/"}>
      <Text size="body_sm">
        <Flex gap={4}>
          <Logo_Links />links
        </Flex>
      </Text>
    </A>
  );
}

export function Header() {
  return (<>
    <Flex tag="header"
      align_items="center"
      justify_content="space-between"
      css={{
        position: "fixed",
        width: "100%",
        ...get_screen_padding()
      }}
    >
      <A href={"/"}><Text size="body_md"><Logo /></Text></A>
      <Glinks />
    </Flex>
  </>);
}