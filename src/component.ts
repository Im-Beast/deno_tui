// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { ComponentEvent } from "./events.ts";
import { emptyStyle, Style, Theme } from "./theme.ts";
import { Tui } from "./tui.ts";
import { EventRecord, TypedEventTarget } from "./utils/typed_event_target.ts";

import type { ViewComponent } from "./components/view.ts";
import type { Rectangle } from "./types.ts";

export interface ComponentOptions {
  /** Parent tui, used for retrieving canvas and adding event listeners */
  tui: Tui;
  /** Component that can manipulate drawing position on the canvas by replacing `tui` element with fake one */
  view?: ViewComponent;
  /** Theme defining look of component */
  theme?: Partial<Theme>;
  /** Position and size of component */
  rectangle?: Rectangle;
  /** Components get rendered based on this value, lower values get rendered first */
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
  theme: Theme;
  #state: ComponentState;
  zIndex: number;

  view?: ViewComponent;
  rectangle?: Rectangle;

  constructor({ rectangle, theme, zIndex, tui, view }: ComponentOptions) {
    super();

    this.rectangle = rectangle;
    this.theme = {
      base: theme?.base ?? emptyStyle,
      focused: theme?.focused ?? theme?.base ?? emptyStyle,
      active: theme?.active ?? theme?.focused ?? theme?.base ?? emptyStyle,
    };
    this.zIndex = zIndex ?? 0;
    this.#state = "base";
    this.tui = tui;
    this.view = view;

    // This should run after everything else is setup
    // That's why it's added after everything on even loop is ready
    queueMicrotask(() => {
      this.tui.components.push(this);
      this.tui.dispatchEvent(new ComponentEvent("addComponent", this));
    });
  }

  /**
   * Returns current component style
   */
  get style(): Style {
    return this.theme[this.state];
  }

  /** Sets current component state and dispatches stateChange event */
  set state(state) {
    this.#state = state;
    this.dispatchEvent(new ComponentEvent("stateChange", this));
  }

  /** Returns current component state */
  get state() {
    return this.#state;
  }

  /**
   * Function that's used for rendering component
   * It's called on `tui` update event
   */
  draw() {}

  /**
   * Function that's used for interacting with a component
   * It's called by keyboard and mouse control handlers
   */
  interact(_method?: "keyboard" | "mouse") {}

  /**
   * Remove component from `tui` and dispatch `removeComponent` event
   */
  remove() {
    this.tui.components.remove(this);
    this.tui.dispatchEvent(new ComponentEvent("removeComponent", this));
  }
}
