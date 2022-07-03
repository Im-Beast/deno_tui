import { crayon } from "./deps.ts";
import { Style, Theme } from "./theme.ts";
import { Tui } from "./tui.ts";
import { Rectangle } from "./types.ts";
import { TypedEventTarget } from "./util.ts";

interface ComponentOptions {
  tui: Tui;
  theme?: Partial<Theme>;
  rectangle?: Rectangle;
}

interface ComponentPrivate {
  theme: Theme;
  draw(): void;
}

export type ComponentImplementation =
  & ComponentOptions
  & ComponentPrivate
  & TypedEventTarget<{
    focus: void;
    activate: void;
  }>;

export type ComponentState =
  | "focused"
  | "unfocused"
  | "activated"
  | "deactivated";

export class Component extends TypedEventTarget<{
  state: ComponentState;
}> implements ComponentImplementation {
  tui: Tui;
  rectangle?: Rectangle;
  theme: Theme;
  style: Style;

  constructor({ tui, rectangle, theme }: ComponentOptions) {
    super();

    this.tui = tui;
    tui.components.push(this);
    this.rectangle = rectangle;
    this.theme = {
      base: theme?.base ?? crayon,
      focused: theme?.focused ?? crayon,
      active: theme?.active ?? crayon,
    };
    this.style = this.theme.base;

    this.addEventListener("state", ({ detail }) => {
      switch (detail.state) {
        case "focused":
          this.style = this.theme.focused;
          break;
        case "activated":
          this.style = this.theme.active;
          break;
        case "unfocused":
        case "inactive":
          this.style = this.theme.base;
          break;
      }
    });
  }

  draw() {}
}
