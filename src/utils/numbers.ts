// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import type { Rectangle } from "../types.ts";

/** Clamp {number} between {min} and {max} */
export function clamp(number: number, min: number, max: number): number {
  return Math.max(Math.min(number, max), min);
}

/** Check whether {number} fits in <{min}, {max}> range */
export function fits(number: number, min: number, max: number): boolean {
  return number === clamp(number, min, max);
}

/** Check whether {column} and {row} fit in {rectangle} boundaries */
export function fitsInRectangle(column: number, row: number, rectangle: Rectangle): boolean {
  return fits(column, rectangle.column, rectangle.column + rectangle.width - 1) &&
    fits(row, rectangle.row, rectangle.row + rectangle.height - 1);
}

/** Check whether rectangle {a} is the same as rectangle {b} */
export function rectangleEquals(a: Rectangle, b: Rectangle): boolean {
  return (a === b) || (a.column === b.column && a.row === b.row && a.width === b.width && a.height === b.height);
}

export function rectangleIntersection(a: Rectangle, b: Rectangle, data?: false): boolean;
export function rectangleIntersection(a: Rectangle, b: Rectangle, data: true): false | Rectangle;
export function rectangleIntersection(a: Rectangle, b: Rectangle, data?: boolean): boolean | Rectangle {
  const { column: c1, row: r1, width: w1, height: h1 } = a;
  const { column: c2, height: h2, width: w2, row: r2 } = b;

  if (
    c1 >= c2 + w2 ||
    c2 >= c1 + w1 ||
    r1 >= r2 + h2 ||
    r2 >= r1 + h1
  ) return false;

  if (!data) return true;

  const colWidth = Math.min(c1 + w1, c2 + w2);
  const rowHeight = Math.min(r1 + h1, r2 + h2);

  const width = Math.max(0, colWidth - Math.max(c1, c2));
  const height = Math.max(0, rowHeight - Math.max(r1, r2));

  const column = colWidth - width;
  const row = rowHeight - height;

  return { column, row, width, height };
}

/** Normalize {value} between 0 and 1 */
export function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) || 0;
}
