// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal, SignalOfObject } from "../signals/signal.ts";
import { Rectangle } from "../types.ts";

export interface LayoutOptions<T extends string> {
  rectangle: Rectangle | SignalOfObject<Rectangle>;
  elements: T[];
}

export interface LayoutElement<T extends string> {
  name: T;
  unitLength: number;
  rectangle: Signal<Rectangle>;
}
