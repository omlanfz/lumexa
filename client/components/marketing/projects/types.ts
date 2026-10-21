import type { ComponentType } from "react";

export type CodeLang = "py" | "js" | "lua" | "cs" | "css" | "blocks";

export interface DemoProps {
  /** Highlights a line (0-based) in the code pane, e.g. when the user triggers it. */
  flash: (line: number) => void;
}

export interface DemoSpec {
  file: string;
  lang: CodeLang;
  /** One string per line. For `blocks`, lines look like "  variables:change [score] by 1". */
  code: string[];
  hint: string;
  Output: ComponentType<DemoProps>;
}
