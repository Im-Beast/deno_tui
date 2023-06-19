import { Signal } from "../signals/signal.ts";
import { signalify } from "../utils/signals.ts";

import { LayoutInvalidElementsPatternError, LayoutMissingElementError } from "./errors.ts";

import type { Rectangle } from "../types.ts";
import type { LayoutElement, LayoutOptions } from "./types.ts";

export class HorizontalLayout<T extends string> {
  rectangle: Signal<Rectangle>;

  totalUnitLength: number;
  elements: LayoutElement<T>[];

  constructor(options: LayoutOptions<T>) {
    this.totalUnitLength = 0;
    this.elements = [];

    const elementToIndex = new Map<string, number>();

    const { elements } = this;
    let lastElement: T | undefined;
    for (const element of options.elements) {
      let key = elementToIndex.get(element);
      if (!key) {
        elements.push({
          name: element,
          unitLength: 0,
          rectangle: new Signal({ column: 0, height: 0, row: 0, width: 0 }, { deepObserve: true }),
        });
        key = elements.length - 1;
        elementToIndex.set(element, key);
      } else if (lastElement !== element) {
        throw new LayoutInvalidElementsPatternError();
      }

      elements[key].unitLength++;
      this.totalUnitLength++;

      lastElement = element;
    }

    this.rectangle = signalify(options.rectangle, { deepObserve: true });
    this.rectangle.subscribe(() => {
      this.update();
    });
    this.update();
  }

  update() {
    const { elements, totalUnitLength } = this;
    const { column, row, width, height } = this.rectangle.value;

    for (const element in elements) {
      const rectangle = elements[element].rectangle.peek();

      rectangle.height = height;
      rectangle.column = column;
      rectangle.row = row;
    }

    const elementWidth = Math.round(width / totalUnitLength);

    let widthDiff = width;
    let currentColumn = 0;
    for (const i in elements) {
      const element = elements[i];
      const rectangle = element.rectangle.peek();

      const currentElementWidth = elementWidth * element.unitLength;

      rectangle.width = currentElementWidth;
      widthDiff -= currentElementWidth;

      rectangle.column = currentColumn + column;
      currentColumn += rectangle.width;
    }

    elements.at(-1)!.rectangle.value.width += widthDiff;
  }

  element(name: T): Signal<Rectangle> {
    const element = this.elements.find((element) => element.name === name);
    if (!element) throw new LayoutMissingElementError(name);
    return element.rectangle;
  }
}
