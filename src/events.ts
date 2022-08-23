// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { KeyPress, MousePress, MultiKeyPress } from "./key_reader.ts";

import type { Component } from "./component.ts";
import type { ConsoleSize, Timing } from "./types.ts";

/** Event that's dispatched when new canvas frame was prepared */
export class FrameEvent extends Event {
  readonly timing: Timing;

  constructor(timing: Timing) {
    super("frame");
    this.timing = timing;
  }
}

/** Event that's dispatched when new canvas frame was rendered */
export class RenderEvent extends Event {
  readonly timing: Timing;

  constructor(timing: Timing) {
    super("render");
    this.timing = timing;
  }
}

/** Event that's dispatched when new canvas got resized */
export class CanvasResizeEvent extends Event {
  readonly size: ConsoleSize;

  constructor(size: ConsoleSize) {
    super("resize");
    this.size = size;
  }
}

/** Event that's dispatched when key has been pressed */
export class KeyPressEvent extends Event {
  readonly keyPress: KeyPress;

  constructor(keyPress: KeyPress) {
    super("keyPress");
    this.keyPress = keyPress;
  }
}

/** Event that's dispatched when multiple keys have been pressed */
export class MultiKeyPressEvent extends Event {
  readonly multiKeyPress: MultiKeyPress;

  constructor(multiKeyPress: MultiKeyPress) {
    super("multiKeyPress");
    this.multiKeyPress = multiKeyPress;
  }
}

/** Event that's dispatched when mouse key has been pressed */
export class MousePressEvent extends Event {
  readonly mousePress: MousePress;

  constructor(mousePress: MousePress) {
    super("mousePress");
    this.mousePress = mousePress;
  }
}

/** Event that defines changes regarding given component */
export class ComponentEvent<EventType extends string = string, ComponentType extends Component = Component>
  extends Event {
  readonly component: ComponentType;

  constructor(type: EventType, component: ComponentType) {
    super(type);
    this.component = component;
  }
}
