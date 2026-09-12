import { get_screen_padding, Flex } from "@/gla_ui";
import { Header } from "@/components";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Flex
        tag="main"
        direction="column"
        gap={96}
        css={{
          ...get_screen_padding()
        }}
      >
        {children}
      </Flex>
    </>
  );
}