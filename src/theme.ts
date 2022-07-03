export type Style = (text: string) => string;

export interface Theme {
  base: Style;
  focused: Style;
  active: Style;
}
