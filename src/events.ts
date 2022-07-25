import { CanvasSize } from "./canvas.ts";
import { Component } from "./component.ts";
import { KeyPress, MousePress, MultiKeyPress } from "./key_reader.ts";
import { Timing } from "./util.ts";

export class FrameEvent extends Event {
  readonly timing: Timing;

  constructor(timing: Timing) {
    super("frame");
    this.timing = timing;
  }
}

export class RenderEvent extends Event {
  readonly timing: Timing;

  constructor(timing: Timing) {
    super("render");
    this.timing = timing;
  }
}

export class CanvasResizeEvent extends Event {
  readonly size: CanvasSize;

  constructor(size: CanvasSize) {
    super("render");
    this.size = size;
  }
}

export class KeypressEvent extends Event {
  readonly keyPress: KeyPress;

  constructor(keyPress: KeyPress) {
    super("keyPress");
    this.keyPress = keyPress;
  }
}

export class MultiKeyPressEvent extends Event {
  readonly multiKeyPress: MultiKeyPress;

  constructor(multiKeyPress: MultiKeyPress) {
    super("multiKeyPress");
    this.multiKeyPress = multiKeyPress;
  }
}

export class MousePressEvent extends Event {
  readonly mousePress: MousePress;

  constructor(mousePress: MousePress) {
    super("mousePress");
    this.mousePress = mousePress;
  }
}

export class ComponentEvent<EventType extends string = string, ComponentType extends Component = Component>
  extends Event {
  readonly component: ComponentType;

  constructor(type: EventType, component: ComponentType) {
    super(type);
    this.component = component;
  }
}
