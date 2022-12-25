// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { PlaceComponent, PlaceComponentOptions } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";

/** Simple component that is a Box that cannot be interacted with by default */
export class Box<EventMap extends EventRecord = Record<never, never>> extends PlaceComponent<EventMap> {
  constructor(options: PlaceComponentOptions) {
    super(options);
  }

  draw(): void {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    canvas.draw(column, row, style((" ".repeat(width) + "\n").repeat(height)), this);
  }
}
