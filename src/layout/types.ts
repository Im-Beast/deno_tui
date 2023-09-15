// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import type { Signal } from "../signals/signal.ts";
import type { Rectangle } from "../types.ts";

export interface LayoutOptions<T extends string> {
  /** Position and size of Layout */
  rectangle: Rectangle | Signal<Rectangle>;
  /** Arrangement of elements on layout */
  pattern: T[] | Signal<T[]>;
  /** Horizontal gap between elements */
  gapX?: number | Signal<number>;
  /** Vertical gap between elements */
  gapY?: number | Signal<number>;
}

export interface LayoutElement<T extends string> {
  name: T;
  unitLength: number;
  rectangle: Signal<Rectangle>;
}

export interface Layout<T extends string> {
  element(name: T): Signal<Rectangle>;
  updatePattern(): void;
  updateElements(): void;

  rectangle: Signal<Rectangle>;
  gapX: Signal<number>;
  gapY: Signal<number>;

  pattern: unknown;
  elements: unknown[];
  elementNameToIndex: Map<T, number>;
}
