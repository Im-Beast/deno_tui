// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { Rectangle } from "../types.ts";

export function clamp(number: number, min: number, max: number): number {
  return Math.max(Math.min(number, max), min);
}

export function fits(number: number, min: number, max: number): boolean {
  return number === clamp(number, min, max);
}

export function fitsInRectangle(column: number, row: number, rectangle?: Rectangle): boolean {
  if (!rectangle) return true;
  return fits(column, rectangle.column, rectangle.column + rectangle.width) &&
    fits(row, rectangle.row, rectangle.row + rectangle.height);
}

export function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) || 0;
}
