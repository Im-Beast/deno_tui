// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "../signals/signal.ts";
import { signalify } from "../utils/signals.ts";

import { LayoutInvalidElementsPatternError, LayoutMissingElementError } from "./errors.ts";

import type { Rectangle } from "../types.ts";
import type { Layout, LayoutElement, LayoutOptions } from "./types.ts";
import { Effect } from "../signals/effect.ts";

export class HorizontalLayout<T extends string> implements Layout<T> {
  rectangle: Signal<Rectangle>;

  gapX: Signal<number>;
  gapY: Signal<number>;

  pattern: Signal<T[]>;
  totalUnitLength: number;
  elements: LayoutElement<T>[];
  elementNameToObject: Map<T, number>;

  constructor(options: LayoutOptions<T>) {
    this.totalUnitLength = 0;

    this.elements = [];
    this.elementNameToObject = new Map();

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
    const { elementNameToObject } = this;
    elementNameToObject.clear();

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

    const elementWidth = Math.round(width / totalUnitLength);

    let currentColumn = 0;
    let widthDiff = width - (elementWidth * totalUnitLength) - gapX;
    let partDiff = (widthDiff < 0 ? 1 : -1) *
      Math.ceil(Math.abs(widthDiff) / elements.length);
    for (const i in elements) {
      const element = elements[i];
      const rectangle = element.rectangle.peek();

      rectangle.height = height - gapY * 2;
      rectangle.row = row + gapY;

      const currentElementWidth = (elementWidth - partDiff) * element.unitLength;

      widthDiff += partDiff;
      if (widthDiff === 0) {
        partDiff = 0;
      }

      rectangle.width = currentElementWidth - gapX;

      rectangle.column = gapX + currentColumn + column;
      currentColumn += rectangle.width + gapX;
    }
  }

  element(name: T): Signal<Rectangle> {
    const element = this.elements.find((element) => element.name === name);
    if (!element) throw new LayoutMissingElementError(name);
    return element.rectangle;
  }
}
