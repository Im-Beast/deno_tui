import { crayon } from "./deps.ts";
import { Style, Theme } from "./theme.ts";
import { Tui } from "./tui.ts";
import { Rectangle } from "./types.ts";
import { TypedCustomEvent, TypedEventTarget } from "./util.ts";

export interface ComponentOptions {
  tui: Tui;
  theme?: Partial<Theme>;
  rectangle?: Rectangle;
  zIndex?: number;
}

export interface ComponentPrivate {
  theme: Theme;
  draw(): void;
  interact(): void;
  state: ComponentState;
  zIndex: number;
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

export type ComponentEventMap<
  EventMap extends (Record<string, unknown> & { state: ComponentState }) = {
    state: ComponentState;
  },
> = EventMap;

export class Component<EventMap extends ComponentEventMap = ComponentEventMap> extends TypedEventTarget<EventMap>
  implements ComponentImplementation {
  tui: Tui;
  rectangle?: Rectangle;
  theme: Theme;
  style: Style;
  #state: ComponentState;
  resetStateAfterInteraction: boolean;
  resetState: boolean;
  zIndex: number;

  constructor({ rectangle, theme, zIndex, tui }: ComponentOptions) {
    super();

    this.rectangle = rectangle;
    this.theme = {
      base: theme?.base ?? crayon,
      focused: theme?.focused ?? theme?.base ?? crayon,
      active: theme?.active ?? theme?.focused ?? theme?.base ?? crayon,
    };
    this.zIndex = zIndex ?? 0;

    this.style = this.theme.base;
    this.#state = "base";
    this.resetState = false;
    this.resetStateAfterInteraction = true;

    this.tui = tui;

    queueMicrotask(async () => {
      await this.tui.components.push(this);
    });
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
    if (this.resetStateAfterInteraction && this.resetState) {
      this.state = "base";
    }
  }

  interact() {
  }

  remove() {
    this.tui.components.remove(this);
  }
}
