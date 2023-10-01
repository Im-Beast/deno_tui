// Copyright 2023 Im-Beast. MIT license.
import { Signal } from "../signals/signal.ts";
import { signalify } from "../utils/signals.ts";

import { LayoutInvalidElementsPatternError, LayoutMissingElementError } from "./errors.ts";

import type { Rectangle } from "../types.ts";
import type { Layout, LayoutElement, LayoutOptions } from "./types.ts";
import { Effect } from "../signals/effect.ts";

export interface GridLayoutOptions<T extends string> extends Omit<LayoutOptions<T>, "pattern"> {
  pattern: T[][] | Signal<T[][]>;
}

export interface GridLayoutElement<T extends string> extends Omit<LayoutElement<T>, "unitLength"> {
  unitLengthX: number;
  unitLengthY: number;
  startX: number;
  startY: number;
  accumulatedX: number;
}

/**
 * GridLayout allows you to position elements in rows and columns
 * so that they occupy whole space (GridLayout's `rectangle`)
 *
 * @example
 * ```ts
 * const layout = new GridLayout({
 *  // pattern defines how elements will be positioned
 *  // This pattern tells us that we have elements of id's `"a"`, `"b"` and `"c"`
 *  // Where `"a"` width and height spans over two units whereas each `"b"` and `"c"` width and height spans over 1 unit
 *  //
 *  // You can think of units as proportions:
 *  //  - This pattern is 3 unit wide (we defined 3 elements in each row array)
 *  //  - in every row a is defined two times, this means it will be 2 unit wide (2/3, it will take 66.6% of the available horizontal space) and 2 units high (2/2, it will take 100% of the vertical space)
 *  //  - b and c are each defined one time in just one row, this means they will be 1 unit wide (1/3, they both will take 33.3% of remaining horizontal space) and 1 unit high (1/2, 50% of the vertical space)
 *  pattern: [
 *    [ "a", "a", "b" ],
 *    [ "a", "a", "c" ],
 *  ],
 *  // gapX defines a horizontal gap (margin) between every layouts element
 *  gapX: 0,
 *  // gapY defines a vertical gap (margin) between every layouts element
 *  gapY: 0,
 *  // Size of a GridLayout, `tui.rectangle` means we want to occupy the whole Tui's space
 *  rectangle: tui.rectangle,
 * });
 *
 * // To make elements use layout, you need to set their rectangle as GridLayout.element(layoutId)
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

    let currentRow = 0;
    const elementsByRow: GridLayoutElement<T>[][] = [[]];
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
        elementsByRow[++currentRow] = [];
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

      elementsByRow[currentRow].push(element);

      const currentElementWidth = elementWidth * element.unitLengthX;

      rectangle.column = column + gapX + element.startX * elementWidth;
      rectangle.width = currentElementWidth - gapX;
      widthDiff -= currentElementWidth;

      lastElement = element;
    }

    if (lastElement) {
      const lastElementRectangle = lastElement.rectangle.peek();
      heightDiff -= lastElementRectangle.height / lastElement.unitLengthY;

      // Actually only fixing width of element that is in the most bottom-right corner is neccessary, because other elements widths adjusted before
      // This can probably be cleaner though.
      const lastRowElementNames = pattern[lastElement.startY];
      const bottomRightElementName = lastRowElementNames[lastRowElementNames.length - 1];
      const bottomRightElement = elements[elementNameToIndex.get(bottomRightElementName)!];
      const bottomRightRectangle = bottomRightElement.rectangle.peek();

      if (lastRowElementNames[0] === bottomRightElementName) {
        // Bottom-right element actually spans through whole row
        bottomRightRectangle.width += widthDiff - gapX;
      } else if (bottomRightElement.unitLengthY === 1) {
        // Only adjust if it's 1-unit heigh, otherwise it got adjusted before
        bottomRightRectangle.width -= lastElementRectangle.column +
          lastElementRectangle.width - width + gapX;
      }

      // Adjust height of elements so that they are fit to rectangle's size
      // while keeping proper proportions
      let diff = heightDiff - gapY;
      const piece = (diff < 0 ? 1 : -1) * Math.ceil(Math.abs(diff) / elementsByRow.length);
      const amount = Math.abs(diff / piece);
      for (let i = 1; i <= amount; ++i) {
        const rowElements = elementsByRow[elementsByRow.length - i];
        for (const element of rowElements) {
          const rectangle = element.rectangle.peek();
          rectangle.height -= piece + gapY;

          if (amount > 2) {
            rectangle.row += -(amount - i);
          } else if (i < amount) {
            rectangle.row -= piece + gapY;
          }
        }

        diff += piece;
      }

      for (const element of lastRowElements) {
        const rectangle = element.rectangle.peek();
        rectangle.height += (row + height) - (rectangle.row + rectangle.height) - gapY;
      }
    }
  }

  element(name: T): Signal<Rectangle> {
    const element = this.elements.find((element) => element.name === name);
    if (!element) throw new LayoutMissingElementError(name);
    return element.rectangle;
  }
}
