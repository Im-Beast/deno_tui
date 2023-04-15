import { Tui } from "./tui.ts";
import { hierarchizeTheme, Style, Theme } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";

import type { KeyPress, MousePress, MultiKeyPress, Rectangle } from "./types.ts";
import { SortedArray } from "./utils/sorted_array.ts";
import { DrawObject } from "./canvas/draw_object.ts";

// TODO: Allow components to take PossibleDynamic values
export interface ComponentOptions {
  theme: Partial<Theme>;
  parent: Component | Tui;
  rectangle: Rectangle;
  tui?: Tui;
  zIndex?: number;
  view?: View;
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
  view?: View;
  theme: Theme;
  zIndex: number;
  parent: Component | Tui;
  rectangle: Rectangle;
  children: SortedArray<Component>;
  state: ComponentState;
  drawnObjects: Record<string, DrawObject | DrawObject[]>;
  subComponents: Record<string, Component>;
  lastInteraction: Interaction;

  constructor(options: ComponentOptions) {
    super();

    this.view = options.view;
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

    if (!value) {
      this.eraseDrawnObjects(false);

      for (const children of this.children) {
        children.visible = value;
      }
    } else {
      this.redrawDrawnObjects();

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

  redrawDrawnObjects() {
    const { drawnObjects } = this;
    for (const value of Object.values(drawnObjects)) {
      if (Array.isArray(value)) {
        for (const object of value) {
          object.draw();
        }
      } else {
        value.draw();
      }
    }
  }

  eraseDrawnObjects(remove: boolean) {
    const { drawnObjects } = this;
    for (const [key, value] of Object.entries(drawnObjects)) {
      if (Array.isArray(value)) {
        for (const object of value) {
          object.erase();
        }
      } else {
        value.erase();
      }

      if (remove) delete drawnObjects[key];
    }
  }

  remove(): void {
    this.off();
    this.eraseDrawnObjects(true);
    this.parent.children.remove(this);

    const subComponents = this.subComponentOf?.subComponents;
    if (!subComponents) return;

    for (const index in subComponents) {
      if (subComponents[index] === this) delete subComponents[index];
    }
  }

  draw(): void {
    this.eraseDrawnObjects(true);
  }

  update(): void {
    if (this.state !== this.#lastState) {
      this.emit("stateChange", this);
    }
  }
}
