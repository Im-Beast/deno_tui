// Copyright 2023 Im-Beast. All rights reserved. MIT license.

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
  return (
    rectangle.width !== 0 && rectangle.height !== 0 &&
    column >= rectangle.column && column < rectangle.column + rectangle.width &&
    row >= rectangle.row && row < rectangle.row + rectangle.height
  );
}

/** Check whether rectangle {a} is the same as rectangle {b} */
export function rectangleEquals(a: Rectangle, b: Rectangle): boolean {
  return (a === b) || (a.column === b.column && a.row === b.row && a.width === b.width && a.height === b.height);
}

const intersectionObject = { column: 0, row: 0, width: 0, height: 0 };
/**
 * Calculate intersection between two rectangles
 *
 * When `data` is set to true it returns:
 *  - collision rectangle when they collide
 *  - false when they don't
 *
 * Otherwise it simply returns boolean whether they collide
 *
 * **Don't hold onto intersection object reference that gets returned!**
 *
 * **It gets reused to save CPU usage and minimize GC.**
 */
export function rectangleIntersection(a: Rectangle, b: Rectangle, data?: false): boolean;
export function rectangleIntersection(a: Rectangle, b: Rectangle, data: true): false | Rectangle;
export function rectangleIntersection(a: Rectangle, b: Rectangle, data?: boolean): boolean | Rectangle {
  const { column: c1, row: r1, width: w1, height: h1 } = a;
  if (w1 === 0 || h1 === 0) false;
  const { column: c2, row: r2, width: w2, height: h2 } = b;
  if (w2 === 0 || h2 === 0) false;

  if (
    c1 >= c2 + w2 || c2 >= c1 + w1 ||
    r1 >= r2 + h2 || r2 >= r1 + h1
  ) {
    return false;
  } else if (!data) {
    return true;
  }

  const colWidth = Math.min(c1 + w1, c2 + w2);
  const rowHeight = Math.min(r1 + h1, r2 + h2);

  const width = Math.max(0, colWidth - Math.max(c1, c2));
  if (width === 0) return false;
  const height = Math.max(0, rowHeight - Math.max(r1, r2));
  if (height === 0) return false;

  intersectionObject.column = colWidth - width;
  intersectionObject.row = rowHeight - height;
  intersectionObject.width = width;
  intersectionObject.height = height;

  return intersectionObject;
}

/** Normalize {value} between 0 and 1 */
export function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) || 0;
}
