import { crayon } from "./deps.ts";
import { ComponentEvent } from "./events.ts";
import { Style, Theme } from "./theme.ts";
import { Tui } from "./tui.ts";
import { Rectangle } from "./types.ts";
import { EventRecord, TypedEventTarget } from "./util.ts";

export interface ComponentOptions {
  tui: Tui;
  theme?: Partial<Theme>;
  rectangle?: Rectangle;
  zIndex?: number;
}

export interface ComponentPrivate {
  theme: Theme;
  draw(): void;
  interact(method?: "keyboard" | "mouse"): void;
  state: ComponentState;
  zIndex: number;
}

export type ComponentEventMap = {
  stateChange: ComponentEvent<"stateChange">;
};

export type ComponentImplementation =
  & ComponentOptions
  & ComponentPrivate
  & TypedEventTarget<ComponentEventMap>;

export type ComponentState =
  | "focused"
  | "active"
  | "base";

export class Component<
  EventMap extends EventRecord = Record<never, never>,
> extends TypedEventTarget<EventMap & ComponentEventMap> implements ComponentImplementation {
  tui: Tui;
  rectangle?: Rectangle;
  theme: Theme;
  #state: ComponentState;
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

    this.#state = "base";

    this.tui = tui;

    queueMicrotask(() => {
      this.tui.components.push(this);
      this.tui.dispatchEvent(new ComponentEvent("addComponent", this));
    });
  }

  get style(): Style {
    return this.theme[this.state];
  }

  set state(state) {
    this.#state = state;

    this.dispatchEvent(new ComponentEvent("stateChange", this));
  }

  get state() {
    return this.#state;
  }

  draw() {}

  interact(_method?: "keyboard" | "mouse") {}

  remove() {
    this.tui.components.remove(this);
    this.tui.dispatchEvent(new ComponentEvent("removeComponent", this));
  }
}
