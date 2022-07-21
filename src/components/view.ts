import { Canvas } from "../canvas.ts";
import { Tui } from "../tui.ts";
import { Rectangle } from "../types.ts";
import { Component, ComponentOptions } from "../component.ts";
import { SortedArray } from "../util.ts";

export type ViewedComponent = Omit<Component, "tui"> & { tui: FakeTui };

export interface FakeCanvas extends Canvas {
  canvas: Canvas;
  rectangle: Rectangle;
}

export interface FakeTui extends Tui {
  tui: Tui;
  view: ViewComponent;
  canvas: FakeCanvas;
}

export interface ViewComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
}

export class ViewComponent extends Component {
  viewComponents = new SortedArray<Component>();
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

  constructor(options: ViewComponentOptions) {
    super(options);

    this.offset = { x: 0, y: 0 };
    this.maxOffset = { x: 0, y: 0 };

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

    const fakeTui = { tui, canvas: fakeCanvas, view: this } as unknown as FakeTui;
    Object.setPrototypeOf(fakeTui, tui);

    fakeTui.addEventListener("addComponent", ({ detail: component }) => {
      if (component === this || component.tui !== fakeTui) return;
      const { rectangle } = component;
      if (!rectangle) return;

      this.viewComponents.push(component);
      const { column, row, width, height } = rectangle;

      this.maxOffset = {
        x: Math.max(this.maxOffset.x, column + width - this.rectangle.width),
        y: Math.max(this.maxOffset.y, row + height - this.rectangle.height),
      };
    });

    fakeTui.addEventListener("removeComponent", ({ detail: component }) => {
      let x = 0;
      let y = 0;

      this.viewComponents.remove(component);
      for (const component of this.viewComponents) {
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
    const { canvas } = this.tui.tui;
    const { column, row, width, height } = this.rectangle;

    const textRow = style(" ".repeat(width));

    for (let r = row; r < row + height; ++r) {
      canvas.draw(column, r, textRow);
    }
  }
}
