import { Signal } from "../signals/signal.ts";
import { signalify } from "../utils/signals.ts";

import { LayoutInvalidElementsPatternError, LayoutMissingElementError } from "./errors.ts";

import type { Rectangle } from "../types.ts";
import type { LayoutElement, LayoutOptions } from "./types.ts";

export interface GridLayoutOptions<T extends string> extends Omit<LayoutOptions<T>, "elements"> {
  elements: T[][];
}

export interface GridLayoutElement<T extends string> extends Omit<LayoutElement<T>, "unitLength"> {
  unitLengthX: number;
  unitLengthY: number;

  startX: number;
  startY: number;
  accumulatedX: number;
}

export class GridLayout<T extends string> {
  rectangle: Signal<Rectangle>;

  totalUnitLengthX: number;
  totalUnitLengthY: number;
  elements: GridLayoutElement<T>[];

  constructor(options: GridLayoutOptions<T>) {
    this.totalUnitLengthY = options.elements.length;
    this.totalUnitLengthX = options.elements[0].length;
    this.elements = [];

    const elementToIndex = new Map<string, number>();

    const { elements } = this;
    for (let row = 0; row < options.elements.length; ++row) {
      const rowElements = options.elements[row];

      let column = 0;

      for (const name of rowElements) {
        let key = elementToIndex.get(name);
        if (key === undefined) {
          elements.push({
            name: name,
            startX: column,
            startY: row,
            unitLengthX: 0,
            unitLengthY: 0,
            accumulatedX: 0,
            rectangle: new Signal({ column: 0, height: 0, row: 0, width: 0 }, { deepObserve: true }),
          });
          key = elements.length - 1;
          elementToIndex.set(name, key);
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

    this.rectangle = signalify(options.rectangle, { deepObserve: true });
    this.rectangle.subscribe(() => {
      this.update();
    });
    this.update();
  }

  update() {
    const { elements, totalUnitLengthX, totalUnitLengthY } = this;
    const { column, row, width, height } = this.rectangle.value;

    for (const element in elements) {
      const rectangle = elements[element].rectangle.peek();

      rectangle.width = width;
      rectangle.column = column;
      rectangle.row = row;
    }

    const lastRowElements: GridLayoutElement<T>[] = [];

    const elementHeight = Math.round(height / totalUnitLengthY);
    let heightDiff = height;

    const elementWidth = Math.round(width / totalUnitLengthX);
    let widthDiff = width;

    let lastElement: GridLayoutElement<T> | undefined;
    let firstElement: GridLayoutElement<T> | undefined;
    for (const i in elements) {
      const element = elements[i];

      if (element.startY + element.unitLengthY === totalUnitLengthY) {
        lastRowElements.push(element);
      }

      const rectangle = element.rectangle.peek();

      const currentElementHeight = elementHeight * element.unitLengthY;

      rectangle.row = element.startY * elementHeight + row;
      rectangle.height = currentElementHeight;

      if (lastElement && element.startY !== lastElement.startY) {
        if (lastElement !== firstElement) {
          lastElement.rectangle.value.width += widthDiff;
        }
        heightDiff -= currentElementHeight;
        widthDiff = width;
        firstElement = element;
      }

      const currentElementWidth = elementWidth * element.unitLengthX;

      rectangle.column = element.startX * elementWidth;
      rectangle.width = currentElementWidth;
      widthDiff -= currentElementWidth;

      lastElement = element;
    }

    lastElement = elements.at(-1);
    if (lastElement) {
      const rectangle = lastElement.rectangle.value;
      heightDiff -= rectangle.height;

      if (lastRowElements.length > 1) {
        widthDiff -= rectangle.width;
      } else {
        rectangle.width += widthDiff;
      }

      for (const element of lastRowElements) {
        element.rectangle.value.height += heightDiff;
      }
    }
  }

  element(name: T): Signal<Rectangle> {
    const element = this.elements.find((element) => element.name === name);
    if (!element) throw new LayoutMissingElementError(name);
    return element.rectangle;
  }
}
