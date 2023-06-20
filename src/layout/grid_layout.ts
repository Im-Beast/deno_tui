// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "../signals/signal.ts";
import { signalify } from "../utils/signals.ts";

import { LayoutInvalidElementsPatternError, LayoutMissingElementError } from "./errors.ts";

import type { Rectangle } from "../types.ts";
import type { Layout, LayoutElement, LayoutOptions } from "./types.ts";
import { Effect } from "../signals/effect.ts";

export interface GridLayoutOptions<T extends string> extends Omit<LayoutOptions<T>, "pattern" | "gap"> {
  pattern: T[][] | Signal<T[][]>;
  gapX?: number | Signal<number>;
  gapY?: number | Signal<number>;
}

export interface GridLayoutElement<T extends string> extends Omit<LayoutElement<T>, "unitLength"> {
  unitLengthX: number;
  unitLengthY: number;

  startX: number;
  startY: number;
  accumulatedX: number;
}

export class GridLayout<T extends string> implements Layout<T> {
  rectangle: Signal<Rectangle>;

  gapX: Signal<number>;
  gapY: Signal<number>;

  pattern: Signal<T[][]>;
  totalUnitLengthX: number;
  totalUnitLengthY: number;
  elements: GridLayoutElement<T>[];
  elementNameToIndex: Map<T, number>;

  constructor(options: GridLayoutOptions<T>) {
    this.totalUnitLengthX = 0;
    this.totalUnitLengthY = 0;
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
    this.totalUnitLengthY = pattern.length;
    this.totalUnitLengthX = pattern[0].length;

    const { elements } = this;

    let i = 0;
    for (let row = 0; row < pattern.length; ++row) {
      const rowElements = pattern[row];
      let column = 0;

      for (const name of rowElements) {
        let key = elementNameToIndex.get(name);
        if (key === undefined) {
          if (elements[i]) {
            const element = elements[i];
            element.name = name;
            element.startX = column;
            element.startY = row;
            element.unitLengthX = 0;
            element.unitLengthY = 0;
            element.accumulatedX = 0;
          } else {
            elements[i] = {
              name: name,
              startX: column,
              startY: row,
              unitLengthX: 0,
              unitLengthY: 0,
              accumulatedX: 0,
              rectangle: new Signal({ column: 0, height: 0, row: 0, width: 0 }, { deepObserve: true }),
            };
          }

          key = i++;
          elementNameToIndex.set(name, key);
        }

        const element = elements[key];

        element.unitLengthY = row - element.startY + 1;
        if (element.unitLengthY === 1) {
          element.unitLengthX++;
        }
        element.accumulatedX++;

        ++column;
      }
    }

    for (const element of elements) {
      if (element.accumulatedX / element.unitLengthX !== element.unitLengthY) {
        throw new LayoutInvalidElementsPatternError();
      }
    }
  }

  updateElements(): void {
    const { elements, totalUnitLengthX, totalUnitLengthY, elementNameToIndex } = this;

    const { column, row, width, height } = this.rectangle.value;
    const pattern = this.pattern.value;
    const gapX = this.gapX.value;
    const gapY = this.gapY.value;

    const elementHeight = Math.round(height / totalUnitLengthY);
    let heightDiff = height;

    const elementWidth = Math.round(width / totalUnitLengthX);
    let widthDiff = width;

    let lastElement: GridLayoutElement<T> | undefined;
    const lastRowElements: GridLayoutElement<T>[] = [];
    for (const i in elements) {
      const element = elements[i];

      const rectangle = element.rectangle.peek();

      const currentElementHeight = elementHeight * element.unitLengthY;

      rectangle.row = row + gapY + element.startY * elementHeight;
      rectangle.height = currentElementHeight - gapY;

      if (element.startY + element.unitLengthY === totalUnitLengthY) {
        lastRowElements.push(element);
      }

      if (lastElement && element.startY !== lastElement.startY) {
        // Row changed
        const rowElementNames = pattern[lastElement.startY];
        const lastRowElementName = rowElementNames[rowElementNames.length - 1];
        const lastRowElement = elements[elementNameToIndex.get(lastRowElementName)!];

        if (rowElementNames[0] === lastRowElementName) {
          // Element takes whole row
          lastElement.rectangle.peek().width += widthDiff - gapX;
        } else if (lastRowElement.startX === lastElement.startX) {
          // Element appears for the first time
          const rectangle = lastRowElement.rectangle.peek();
          rectangle.width -= (rectangle.column + rectangle.width - width) + gapX;
        }

        widthDiff = width;
        heightDiff -= currentElementHeight;
      }

      const currentElementWidth = elementWidth * element.unitLengthX;

      rectangle.column = column + gapX + element.startX * elementWidth;
      rectangle.width = currentElementWidth - gapX;
      widthDiff -= currentElementWidth;

      lastElement = element;
    }

    if (lastElement) {
      heightDiff -= lastElement.rectangle.peek().height / lastElement.unitLengthY;

      const rowElementNames = pattern[lastElement.startY];
      const lastRowElementName = rowElementNames[rowElementNames.length - 1];
      const lastRowElement = elements[elementNameToIndex.get(lastRowElementName)!];
      const lastRectangle = lastRowElement.rectangle.peek();

      if (rowElementNames[0] === lastRowElementName) {
        // Element takes whole row
        lastRectangle.height += heightDiff - gapY * 2;
        lastRectangle.width += widthDiff - gapX;
      } else {
        lastRectangle.width -= lastRectangle.column + lastRectangle.width - width + gapX;

        for (const element of lastRowElements) {
          const rectangle = element.rectangle.peek();
          rectangle.height += heightDiff - gapY * 2;
        }
      }
    }
  }

  element(name: T): Signal<Rectangle> {
    const element = this.elements.find((element) => element.name === name);
    if (!element) throw new LayoutMissingElementError(name);
    return element.rectangle;
  }
}
