import { Flex, A, get_screen_padding, Text } from "@/gla_ui";

export function Header() {
  return (<>
    <Flex tag="header"
      css={{
        position: "fixed",
        ...get_screen_padding()
      }}
    >
      <A href={"https://glakulinks.vercel.app/"}><Text></Text></A>
    </Flex>
  </>);
}