// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { PlaceComponent, PlaceComponentOptions } from "../component.ts";

import { EventRecord } from "../utils/typed_event_target.ts";

export class BoxComponent<EventMap extends EventRecord = Record<never, never>> extends PlaceComponent<EventMap> {
  constructor(options: PlaceComponentOptions) {
    super(options);
  }

  draw() {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    canvas.draw(column, row, style((" ".repeat(width) + "\n").repeat(height)));
  }
}
