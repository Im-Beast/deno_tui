// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "./tui.ts";
import { View } from "./view.ts";
import { emptyStyle, hierarchizeTheme, Style, Theme } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";

import type { KeyPress, MousePress, MultiKeyPress, Rectangle } from "./types.ts";
import type { EventRecord } from "./event_emitter.ts";

/** Type defining any {Component}, even inherited ones */
// deno-lint-ignore no-explicit-any
export type AnyComponent = Component<any>;

/** Interface defining object that {Component}'s constructor can interpret */
export interface ComponentOptions {
  /** Parent tui, used for retrieving canvas and adding event listeners */
  tui: Tui;
  /** Component that can manipulate drawing position on the canvas by replacing `tui` element with fake one */
  view?: View;
  /** Theme defining look of component */
  theme?: Partial<Theme>;
  /** Position and size of component */
  rectangle?: Rectangle;
  /** Components get rendered based on this value, lower values get rendered first */
  zIndex?: number;
  /** Parent of a component */
  parent?: Component | Tui;
  /** Children of a component */
  children?: Component[];
}

/** Interface defining what's accessible in {Component} class */
export interface ComponentPrivate {
  theme: Theme;
  draw(): void;
  interact(method?: "keyboard" | "mouse"): void;
  state: ComponentState;
  zIndex: number;
  children: Component[];
  parent: Tui | Component;
}

/** Implementation for {Component} class */
export type ComponentImplementation = ComponentPrivate;

/** Default EventMap that every component should use */
export type ComponentEventMap = {
  stateChange: EmitterEvent<[Component<EventRecord>]>;
  remove: EmitterEvent<[Component<EventRecord>]>;
  keyPress: EmitterEvent<[KeyPress]>;
  multiKeyPress: EmitterEvent<[MultiKeyPress]>;
  mousePress: EmitterEvent<[MousePress]>;
};

/** Interactivity states that components should use */
export type ComponentState =
  | "base"
  | "focused"
  | "active"
  | "disabled"
  | "hidden";

/** Base Component that should be used as base for creating other components */
export class Component<
  EventMap extends EventRecord = Record<never, never>,
> extends EventEmitter<EventMap & ComponentEventMap> implements ComponentImplementation {
  #state: ComponentState;
  #rectangle?: Rectangle;
  #view?: View;

  tui: Tui;
  theme: Theme;
  zIndex: number;
  parent: Tui | Component;
  children: Component[];

  constructor(options: ComponentOptions) {
    super();

    this.#rectangle = options.rectangle;
    this.theme = hierarchizeTheme(options.theme);
    this.zIndex = options.zIndex ?? 0;
    this.#state = "base";
    this.tui = options.tui;
    this.parent = options.parent ?? options.tui;
    this.children = options.children ?? [];
    this.view = options.view;

    this.tui.on("keyPress", (event) => {
      if (this.#state !== "focused" && this.#state !== "active") return;
      this.emit("keyPress", event);
    });

    this.tui.on("mousePress", (event) => {
      if (this.#state !== "focused" && this.#state !== "active") return;
      this.emit("mousePress", event);
    });

    this.tui.on("multiKeyPress", (event) => {
      if (this.#state !== "focused" && this.#state !== "active") return;
      this.emit("multiKeyPress", event);
    });

    // This should run after everything else is setup
    // That's why it's added after everything on even loop is ready
    queueMicrotask(() => {
      this.tui.components.push(this);
      this.tui.emit("addComponent", this);
    });
  }

  get view(): View | undefined {
    return this.#view;
  }

  set view(view) {
    if (this.#view && view !== this.#view) {
      this.#view.components.remove(this);
    }

    if (view?.components.indexOf(this) === -1) {
      view.components.push(this);
    }

    this.#view = view;
  }

  /** Returns component's rectangle */
  get rectangle(): Rectangle | undefined {
    return this.#rectangle;
  }

  /** Sets component's rectangle */
  set rectangle(rectangle) {
    this.#rectangle = rectangle;
  }

  /** Returns current component style */
  get style(): Style {
    return this.state === "hidden" ? emptyStyle : this.theme[this.state];
  }

  /** Sets current component state and dispatches stateChange event */
  set state(state) {
    this.#state = state;
    this.emit("stateChange", this);
  }

  /** Returns current component state */
  get state(): ComponentState {
    return this.#state;
  }

  /**
   * Function that's used for rendering component
   * It's called on `tui` update event
   */
  draw(): void {}

  /**
   * Function that's used for interacting with a component
   * It's called by keyboard and mouse control handlers
   */
  interact(_method?: "keyboard" | "mouse"): void {}

  /** Remove component from `tui` and dispatch `removeComponent` event   */
  remove(): void {
    this.off();
    this.emit("remove", this);
    this.tui.components.remove(this);
    this.tui.emit("removeComponent", this);
  }
}

/** Interface defining object that {Component}'s constructor can interpret */
export interface PlaceComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
}

/** Component that definitely has it's rectangle set */
export class PlaceComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> {
  #rectangle: Rectangle;

  constructor(options: PlaceComponentOptions) {
    super(options);
    this.#rectangle = options.rectangle;
  }

  get rectangle(): Rectangle {
    return this.#rectangle;
  }

  set rectangle(rectangle) {
    this.#rectangle = rectangle;
  }
}
