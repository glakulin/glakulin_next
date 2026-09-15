import "server-only";
import { get_all_css, get_store } from "./css";

export function ServerStyleSheet() {
  const css_text = get_all_css(get_store());
  if (!css_text) return null;

  return (
    <style
      data-gla=""
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: css_text }}
    />
  );
}