// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions } from "../component.ts";

import { EventRecord } from "../utils/typed_event_target.ts";

import type { Rectangle } from "../types.ts";

export interface BoxComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
}

export class BoxComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  declare rectangle: Rectangle;

  constructor(options: BoxComponentOptions) {
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
