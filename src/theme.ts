export type Style = (text: string) => string;

export function emptyStyle(text: string): string {
  return text;
}

export interface Theme {
  base: Style;
  focused: Style;
  active: Style;
}
