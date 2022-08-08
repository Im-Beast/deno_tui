// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Rectangle } from "../types.ts";

/** Clamp {number} between {min} and {max} */
export function clamp(number: number, min: number, max: number): number {
  return Math.max(Math.min(number, max), min);
}

/** Check whether {number} fits in <{min}, {max}> range */
export function fits(number: number, min: number, max: number): boolean {
  return number === clamp(number, min, max);
}

/** Check whether {column} and {row} fit in {rectangle} boundaries */
export function fitsInRectangle(column: number, row: number, rectangle?: Rectangle): boolean {
  if (!rectangle) return true;
  return fits(column, rectangle.column, rectangle.column + rectangle.width) &&
    fits(row, rectangle.row, rectangle.row + rectangle.height);
}

/** Normalize {value} between 0 and 1 */
export function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) || 0;
}
