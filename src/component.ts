import { Tui } from "./tui.ts";
import { Style, Theme } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";

import { DrawableObject } from "./canvas/mod.ts";

import type { KeyPress, MousePress, MultiKeyPress, Rectangle } from "./types.ts";

export interface ComponentOptions {
  theme: Theme;
  parent: Component | Tui;
  rectangle: Rectangle;
  tui?: Tui;
  zIndex?: number;
  forceDynamicRendering?: boolean;
}

export interface Interaction {
  time: number;
  method: "keyboard" | "mouse" | undefined;
}

export type ComponentState = keyof Theme;

export class Component extends EventEmitter<{
  stateChange: EmitterEvent<[Component]>;
  remove: EmitterEvent<[Component]>;
  keyPress: EmitterEvent<[KeyPress]>;
  multiKeyPress: EmitterEvent<[MultiKeyPress]>;
  mousePress: EmitterEvent<[MousePress]>;
}> {
  tui: Tui;
  theme: Theme;
  zIndex: number;
  parent: Component | Tui;
  rectangle: Rectangle;
  children: Component[];
  state: ComponentState;
  drawnObjects: DrawableObject[];
  lastInteraction: Interaction;
  forceDynamicRendering: boolean;

  constructor(options: ComponentOptions) {
    super();

    this.parent = options.parent;
    this.rectangle = options.rectangle;
    this.theme = options.theme;
    this.forceDynamicRendering = options.forceDynamicRendering ?? false;
    this.zIndex = options.zIndex ?? 0;

    const { parent } = this;
    this.tui = options.tui ?? ("tui" in parent ? parent.tui : parent);

    this.state = "base";
    this.children = [];
    this.drawnObjects = [];

    this.lastInteraction = {
      time: -1,
      method: undefined,
    };
  }

  addChildren(...children: Component[]): void {
    for (const child of children) {
      child.draw();
    }

    this.children.push(...children);
    this.tui.components.push(...children);
  }

  get style(): Style {
    return this.theme[this.state];
  }

  interact(method: "keyboard" | "mouse"): void {
    this.lastInteraction.time = Date.now();
    this.lastInteraction.method = method;
  }

  remove(): void {
    this.tui.canvas.eraseObjects(...this.drawnObjects);

    for (const drawnObject of this.drawnObjects) {
      drawnObject;
    }
    this.off();
  }

  update(): void {}

  draw(): void {}
}
