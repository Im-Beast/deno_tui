// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "../signals/signal.ts";
import { Effect } from "../signals/effect.ts";
import { signalify } from "../utils/signals.ts";

import { LayoutInvalidElementsPatternError, LayoutMissingElementError } from "./errors.ts";

import type { Rectangle } from "../types.ts";
import type { Layout, LayoutElement, LayoutOptions } from "./types.ts";

/**
 * VerticalLayout allows you to position elements in rows
 * so that they occupy whole space (VerticalLayout's `rectangle`)
 *
 * @example
 * ```ts
 * const layout = new VerticalLayout({
 *  // pattern defines how elements will be positioned
 *  // This pattern tells us that we have elements of id's `"a"`, `"b"` and `"c"`
 *  // Where `"a"` height spans over two units whereas `"b"` and `"c"` each height's span over 1 unit
 *  //
 *  // You can think of units as proportions:
 *  //  - This pattern is 4 unit wide (we defined 4 elements in array)
 *  //  - a is defined two times, this means it will be 2 unit wide (2/4, it will take 50% of the available space)
 *  //  - b and c are each defined one time, this means they will be 1 unit wide(1/4, they both will take 25% of remaining space)
 *  pattern: [ "a", "a", "b", "c" ],
 *  // gapX defines a horizontal gap (margin) between vertical layouts rectangle and elements
 *  gapX: 0,
 *  // gapY defines a vertical gap (margin) between every vertical layouts element
 *  gapY: 0,
 *  // Size of a VerticalLayout, `tui.rectangle` means we want to occupy the whole Tui's space
 *  rectangle: tui.rectangle,
 * });
 *
 * // To make elements use layout, you need to set their rectangle as VerticalLayout.element(layoutId)
 * const buttonA = new Button({
 *   ...properties,
 *   rectangle: layout.element("a"),
 * });
 *
 * const buttonB = new Button({
 *   ...properties,
 *   rectangle: layout.element("b"),
 * });
 *
 * const buttonC = new Button({
 *   ...properties,
 *   rectangle: layout.element("c"),
 * });
 * ```
 */
export class VerticalLayout<T extends string> implements Layout<T> {
  rectangle: Signal<Rectangle>;

  gapX: Signal<number>;
  gapY: Signal<number>;

  pattern: Signal<T[]>;
  totalUnitLength: number;
  elements: LayoutElement<T>[];
  elementNameToIndex: Map<T, number>;

  constructor(options: LayoutOptions<T>) {
    this.totalUnitLength = 0;

    this.elements = [];
    this.elementNameToIndex = new Map();

    this.pattern = signalify(options.pattern, {
      deepObserve: true,
      watchObjectIndex: true,
    });
    new Effect(() => this.updatePattern());

    this.gapX = signalify(options.gapX ?? 0);
    this.gapY = signalify(options.gapY ?? 0);

    this.rectangle = signalify(options.rectangle, { deepObserve: true });
    new Effect(() => this.updateElements());
  }

  updatePattern(): void {
    const { elementNameToIndex } = this;
    elementNameToIndex.clear();

    const pattern = this.pattern.value;
    this.totalUnitLength = pattern.length;

    const elementToIndex = new Map<string, number>();

    const { elements } = this;
    let lastElement: T | undefined;
    let i = 0;
    for (const name of pattern) {
      let key = elementToIndex.get(name);
      if (key === undefined) {
        if (elements[i]) {
          const element = elements[i];
          element.name = name;
          element.unitLength = 0;
        } else {
          elements[i] = {
            name: name,
            unitLength: 0,
            rectangle: new Signal({ column: 0, height: 0, row: 0, width: 0 }, { deepObserve: true }),
          };
        }
        key = i++;
        elementToIndex.set(name, key);
      } else if (lastElement !== name) {
        throw new LayoutInvalidElementsPatternError();
      }

      elements[key].unitLength++;

      lastElement = name;
    }
  }

  updateElements() {
    const { elements, totalUnitLength } = this;
    const gapX = this.gapX.value;
    const gapY = this.gapY.value;

    const { column, row, width, height } = this.rectangle.value;

    const elementHeight = Math.round(height / totalUnitLength);

    let currentRow = 0;
    let heightDiff = height - (elementHeight * totalUnitLength) - gapY;
    let partDiff = (heightDiff < 0 ? 1 : -1) * Math.ceil(Math.abs(heightDiff) / elements.length);
    for (const i in elements) {
      const element = elements[i];
      const rectangle = element.rectangle.peek();

      rectangle.width = width - gapX * 2;
      rectangle.column = column + gapX;

      const currentElementHeight = (elementHeight - partDiff) * element.unitLength;

      heightDiff += partDiff;
      if (heightDiff === 0) {
        partDiff = 0;
      }

      rectangle.height = currentElementHeight - gapY;

      rectangle.row = gapY + currentRow + row;

      currentRow += rectangle.height + gapY;
    }
  }

  element(name: T): Signal<Rectangle> {
    const element = this.elements.find((element) => element.name === name);
    if (!element) throw new LayoutMissingElementError(name);
    return element.rectangle;
  }
}
