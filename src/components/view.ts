// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "../tui.ts";
import { Canvas } from "../canvas.ts";
import { Component, ComponentOptions } from "../component.ts";
import type { Margin, Offset, Rectangle } from "../types.ts";

import { EventRecord } from "../utils/typed_event_target.ts";
import { SortedArray } from "../utils/sorted_array.ts";

export interface FakeCanvas extends Canvas {
  canvas: Canvas;
  rectangle: Rectangle;
}

export interface FakeTui extends Tui {
  realTui: Tui;
  canvas: FakeCanvas;
}

export interface ViewComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  margin?: Margin;
}

export class ViewComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  declare rectangle: Rectangle;

  fakeTui: FakeTui;
  offset: Offset;
  maxOffset: Offset;
  margin: Margin;
  components: SortedArray<Component>;

  constructor(options: ViewComponentOptions) {
    super(options);

    this.offset = { x: 0, y: 0 };
    this.maxOffset = { x: 0, y: 0 };
    this.margin = options.margin ?? {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    };

    this.components = new SortedArray<Component>();

    const { canvas } = this.tui;
    const fakeCanvas = { canvas } as unknown as FakeCanvas;
    Object.setPrototypeOf(fakeCanvas, canvas);
    Object.setPrototypeOf(fakeCanvas, {
      draw: (column: number, row: number, value: string) => {
        const { x, y } = this.offset;
        const { column: columnOffset, row: rowOffset, width, height } = this.rectangle;

        fakeCanvas.canvas.draw(
          column + this.margin.left + columnOffset - x,
          row + this.margin.top + rowOffset - y,
          value,
          {
            column: columnOffset,
            row: rowOffset,
            height: height - this.margin.bottom - 1,
            width: width - this.margin.right - 1,
          },
        );
      },
    });

    const { tui } = this;
    const fakeTui = { realTui: tui, canvas: fakeCanvas } as unknown as FakeTui;
    Object.setPrototypeOf(fakeTui, tui);

    fakeTui.addEventListener("addComponent", ({ component }) => {
      if (component.view !== this) return;

      const { rectangle } = component;
      if (!rectangle) return;

      component.tui = fakeTui;
      component.view = this;
      this.components.push(component);

      const { column, row, width, height } = rectangle;

      this.maxOffset = {
        x: Math.max(this.maxOffset.x, column + width - this.rectangle.width),
        y: Math.max(this.maxOffset.y, row + height - this.rectangle.height),
      };
    });

    fakeTui.addEventListener("removeComponent", ({ component }) => {
      if (component.view !== this) return;

      let x = 0;
      let y = 0;

      component.tui = fakeTui.realTui;
      component.view = undefined;
      this.components.remove(component);

      for (const component of this.components) {
        const { rectangle } = component;
        if (!rectangle) continue;

        x = Math.max(x, rectangle.column + rectangle.width);
        y = Math.max(y, rectangle.row + rectangle.height);
      }

      this.maxOffset = { x, y };
    });

    this.fakeTui = fakeTui;
  }

  draw() {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    canvas.draw(column, row, style((" ".repeat(width) + "\n").repeat(height)));
  }
}
