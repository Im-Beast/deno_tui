import { crayon } from "./deps.ts";
import { Style, Theme } from "./theme.ts";
import { Tui } from "./tui.ts";
import { Rectangle } from "./types.ts";
import { TypedCustomEvent, TypedEventTarget } from "./util.ts";

export interface ComponentOptions {
  tui: Tui;
  theme?: Partial<Theme>;
  rectangle?: Rectangle;
}

export interface ComponentPrivate {
  theme: Theme;
  draw(): void;
  interact(): void;
  state: ComponentState;
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
  | "active"
  | "base";

export class Component extends TypedEventTarget<{
  state: ComponentState;
}> implements ComponentImplementation {
  tui: Tui;
  rectangle?: Rectangle;
  theme: Theme;
  style: Style;
  #state: ComponentState;
  resetState: boolean;

  constructor({ tui, rectangle, theme }: ComponentOptions) {
    super();

    this.tui = tui;
    tui.components.push(this);
    this.rectangle = rectangle;
    this.theme = {
      base: theme?.base ?? crayon,
      focused: theme?.focused ?? theme?.base ?? crayon,
      active: theme?.active ?? theme?.focused ?? theme?.base ?? crayon,
    };
    this.style = this.theme.base;
    this.#state = "base";
    this.resetState = false;
  }

  set state(state) {
    this.#state = state;

    switch (state) {
      case "active":
        this.style = this.theme.active;
        break;
      case "focused":
        this.style = this.theme.focused;
        break;
      case "base":
        this.style = this.theme.base;
        break;
    }

    this.dispatchEvent(new TypedCustomEvent("state", { detail: state }));
  }

  get state() {
    return this.#state;
  }

  draw() {
    if (this.resetState) this.state = "base";
  }

  interact() {
    this.draw();
  }
}
