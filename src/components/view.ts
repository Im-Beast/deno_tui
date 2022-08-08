// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { Canvas } from "../canvas.ts";
import { Tui } from "../tui.ts";
import { Rectangle } from "../types.ts";
import { Component, ComponentOptions } from "../component.ts";
import { EventRecord } from "../utils/typed_event_target.ts";
import { SortedArray } from "../utils/sorted_array.ts";

export type ViewedComponent = Omit<Component, "tui"> & { tui: FakeTui };

export interface FakeCanvas extends Canvas {
  canvas: Canvas;
  rectangle: Rectangle;
}

export interface FakeTui extends Tui {
  realTui: Tui;
  view: ViewComponent;
  canvas: FakeCanvas;
}

export interface ViewComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
}

export class ViewComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  declare rectangle: Rectangle;
  declare tui: FakeTui;
  offset: {
    x: number;
    y: number;
  };
  maxOffset: {
    x: number;
    y: number;
  };
  components: SortedArray<Component>;

  constructor(options: ViewComponentOptions) {
    super(options);

    this.offset = { x: 0, y: 0 };
    this.maxOffset = { x: 0, y: 0 };

    this.components = new SortedArray<Component>();

    const { canvas } = this.tui;
    const fakeCanvas = { canvas } as unknown as FakeCanvas;
    Object.setPrototypeOf(fakeCanvas, canvas);
    Object.setPrototypeOf(fakeCanvas, {
      draw: (column: number, row: number, value: string) => {
        const { x, y } = this.offset;
        const { column: columnOffset, row: rowOffset, width, height } = this.rectangle;
        fakeCanvas.canvas.draw(column + columnOffset - x, row + rowOffset - y, value, {
          column: columnOffset,
          row: rowOffset,
          height: height - 1,
          width: width - 1,
        });
      },
    });

    const { tui } = this;
    const fakeTui = { realTui: tui, canvas: fakeCanvas, view: this } as unknown as FakeTui;
    Object.setPrototypeOf(fakeTui, tui);

    fakeTui.addEventListener("addComponent", ({ component }) => {
      if (component === this || component.tui !== fakeTui) return;
      const { rectangle } = component;
      if (!rectangle) return;

      this.components.push(component);
      const { column, row, width, height } = rectangle;

      this.maxOffset = {
        x: Math.max(this.maxOffset.x, column + width - this.rectangle.width),
        y: Math.max(this.maxOffset.y, row + height - this.rectangle.height),
      };
    });

    fakeTui.addEventListener("removeComponent", ({ component }) => {
      let x = 0;
      let y = 0;

      this.components.remove(component);
      for (const component of this.components) {
        const { rectangle } = component;
        if (!rectangle) continue;

        x = Math.max(x, rectangle.column + rectangle.width);
        y = Math.max(y, rectangle.row + rectangle.height);
      }

      this.maxOffset = { x, y };
    });

    this.tui = fakeTui;
  }

  draw() {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui.realTui;
    const { column, row, width, height } = this.rectangle;

    canvas.draw(column, row, style((" ".repeat(width) + "\n").repeat(height)));
  }
}
