import { Tui } from "./tui.ts";
import { hierarchizeTheme, Style, Theme } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";

import { DrawableObject } from "./canvas/mod.ts";

import type { KeyPress, MousePress, MultiKeyPress, Rectangle } from "./types.ts";
import { SortedArray } from "./utils/sorted_array.ts";

export interface ComponentOptions {
  theme: Partial<Theme>;
  parent: Component | Tui;
  rectangle: Rectangle;
  tui?: Tui;
  zIndex?: number;
}

export interface Interaction {
  time: number;
  method: "keyboard" | "mouse" | undefined;
}

export type ComponentState = keyof Theme;

export class Component extends EventEmitter<{
  remove: EmitterEvent<[Component]>;
  stateChange: EmitterEvent<[Component]>;
  valueChange: EmitterEvent<[Component]>;
  keyPress: EmitterEvent<[KeyPress]>;
  mousePress: EmitterEvent<[MousePress]>;
  multiKeyPress: EmitterEvent<[MultiKeyPress]>;
}> {
  declare subComponentOf?: Component;

  #visible: boolean;
  #lastState?: ComponentState;

  tui: Tui;
  theme: Theme;
  zIndex: number;
  parent: Component | Tui;
  rectangle: Rectangle;
  children: SortedArray<Component>;
  state: ComponentState;
  drawnObjects: Record<string, DrawableObject | DrawableObject[]>;
  subComponents: Record<string, Component>;
  lastInteraction: Interaction;

  constructor(options: ComponentOptions) {
    super();

    this.parent = options.parent;
    this.rectangle = options.rectangle;
    this.theme = hierarchizeTheme(options.theme);
    this.zIndex = options.zIndex ?? 0;

    const { parent } = this;
    this.tui = options.tui ?? ("tui" in parent ? parent.tui : parent);

    this.children = new SortedArray();
    this.state = "base";
    this.#visible = true;
    this.drawnObjects = {};
    this.subComponents = {};

    this.lastInteraction = {
      time: -1,
      method: undefined,
    };

    queueMicrotask(() => {
      this.tui.addChildren(this);
    });

    // FIXME: types
    for (const event of ["keyPress", "multiKeyPress", "mousePress"] as const) {
      this.tui.on(event, (arg) => {
        if (this.state === "focused" || this.state === "active") {
          // @ts-expect-error welp
          this.emit(event, arg);
        }
      });
    }
  }

  addChildren(...children: Component[]): void {
    for (const child of children) {
      child.draw();
    }

    this.children.push(...children);
    this.tui.components.push(...children);
  }

  get visible() {
    return this.#visible;
  }

  set visible(value) {
    if (value === this.#visible) return;
    this.#visible = value;

    const { canvas } = this.tui;

    if (!value) {
      canvas.eraseObjects(...Object.values(this.drawnObjects).flat());

      for (const children of this.children) {
        children.visible = value;
      }
    } else {
      canvas.drawObjects(...Object.values(this.drawnObjects).flat());

      for (const children of this.children) {
        children.visible = value;
      }
    }
  }

  get style(): Style {
    return this.theme[this.state];
  }

  interact(method: "keyboard" | "mouse"): void {
    this.lastInteraction.time = Date.now();
    this.lastInteraction.method = method;
  }

  clearDrawnObjects() {
    const { drawnObjects } = this;
    const { canvas } = this.tui;
    for (const key in drawnObjects) {
      delete drawnObjects[key];
    }
    canvas.eraseObjects(...Object.values(drawnObjects).flat());
  }

  remove(): void {
    this.off();
    this.clearDrawnObjects();
    this.parent.children.remove(this);

    const subComponents = this.subComponentOf?.subComponents;
    if (!subComponents) return;

    for (const index in subComponents) {
      if (subComponents[index] === this) delete subComponents[index];
    }
  }

  draw(): void {
    this.clearDrawnObjects();
  }

  update(): void {
    if (this.state !== this.#lastState) {
      this.emit("stateChange", this);
    }
  }
}
