import { get_css } from "../css";

export function Style_Sheet() {
  const css_text = get_css();

  if (!css_text) {
    return null;
  }

  return (
    <style precedence="atomic" href="app-css">
      {css_text}
    </style>
  );
}