import { A, Flex, Text } from '@/gla_ui';

export default function NotFound() {
  return (<>
    <Flex
      direction="column"
      gap={32}
      align_items="center"
      css={{

      }}
    >
      <Text color="error_5" size="heading_xl" css={{ fontSize: 128 }}>404</Text>
      <Text size="body_xl">Page not found</Text>
      <A href={"/"} color="accent_5" color_hover="accent_3"><Text size="body_xs">Return</Text></A>
    </Flex>
  </>);
}