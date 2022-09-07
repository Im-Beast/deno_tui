// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "../tui.ts";
import { Canvas } from "../canvas.ts";
import { Component, PlaceComponent, PlaceComponentOptions } from "../component.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { SortedArray } from "../utils/sorted_array.ts";

import type { _any, Margin, Offset, Rectangle } from "../types.ts";

/** Interface describing object that disguises itself as {Canvas} and intercepts `draw` function and `rectangle` boundaries */
export interface FakeCanvas extends Canvas {
  canvas: Canvas;
  rectangle: Rectangle;
}

/** Interface describing object that disguises itself as {Tui} and replaces `canvas` with {FakeCanvas} */
export interface FakeTui extends Tui {
  realTui: Tui;
  canvas: FakeCanvas;
}

/** Interface defining object that {ViewComponent}'s constructor can interpret */
export interface ViewComponentOptions extends PlaceComponentOptions {
  rectangle: Rectangle;
  /** Empty edge around `rectangle` */
  margin?: Margin;
}

/** Complementary interface defining what's accessible in {ViewComponent} class in addition to {ViewComponentOptions} */
export interface ViewComponentPrivate {
  margin: Margin;
}

/** Implementation for {ViewComponent} class */
export type ViewComponentImplementation = ViewComponentOptions & ViewComponentPrivate;

/**
 * Component that can be assigned to other component's `view` property.
 * This allows components to be drawn independently from other components.
 */
export class ViewComponent<
  EventMap extends Record<string, EmitterEvent> = Record<never, never>,
> extends PlaceComponent<EventMap> implements ViewComponentImplementation {
  fakeTui: FakeTui;
  offset: Offset;
  maxOffset: Offset;
  margin: Margin;
  components: SortedArray<Component<_any>>;

  constructor(options: ViewComponentOptions) {
    super(options);

    this.offset = { x: 0, y: 0 };
    this.maxOffset = { x: 0, y: 0 };
    this.margin = options.margin ?? { top: 0, left: 0, right: 0, bottom: 0 };

    this.components = new SortedArray();

    const { canvas } = this.tui;
    const fakeCanvas = { canvas } as unknown as FakeCanvas;
    Object.setPrototypeOf(fakeCanvas, canvas);
    Object.setPrototypeOf(fakeCanvas, {
      draw: (drawColumn: number, drawRow: number, value: string) => {
        const { x, y } = this.offset;
        const { top, bottom, left, right } = this.margin;
        const { column, row, width, height } = this.rectangle;

        fakeCanvas.canvas.draw(drawColumn + column + left - x, drawRow + row + top - y, value, {
          column,
          row,
          height: height - bottom - 1,
          width: width - right - 1,
        });
      },
    });

    const { tui } = this;
    const fakeTui = { realTui: tui, canvas: fakeCanvas } as FakeTui;
    this.fakeTui = Object.setPrototypeOf(fakeTui, tui);

    fakeTui.on("addComponent", (component) => {
      if (component.view !== this || !component.rectangle) return;

      component.tui = fakeTui;
      component.view = this;

      this.components.push(component);
      this.updateOffsets(component);
    });

    fakeTui.on("removeComponent", (component) => {
      if (component.view !== this) return;

      component.tui = fakeTui.realTui;
      component.view = undefined;

      this.components.remove(component);
      this.updateOffsets();
    });
  }

  /** @param component if specified then checks and updates offsets when given component overflows current offsets otherwise it loops over components to recalculate offsets */
  updateOffsets(component?: Component<_any>): void {
    const { top, bottom, left, right } = this.margin;

    if (!component) {
      this.maxOffset = { x: 0, y: 0 };

      for (const component of this.components) {
        const { column, row, width, height } = component.rectangle!;

        this.maxOffset = {
          x: Math.max(this.maxOffset.x, column + width + right + left - this.rectangle.width),
          y: Math.max(this.maxOffset.y, row + height + bottom + top - this.rectangle.height),
        };
      }

      return;
    }

    if (!component.rectangle) return;

    const { column, row, width, height } = component.rectangle;

    this.maxOffset = {
      x: Math.max(this.maxOffset.x, column + width + right + left - this.rectangle.width),
      y: Math.max(this.maxOffset.y, row + height + bottom + top - this.rectangle.height),
    };
  }

  draw(): void {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    canvas.draw(column, row, style((" ".repeat(width) + "\n").repeat(height)));
  }
}
