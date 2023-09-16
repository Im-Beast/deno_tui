import { Signal } from "../signals/signal.ts";
import { Rectangle } from "../types.ts";
import { unsignalify } from "./signals.ts";

export function doesOverwriteRectangle(rectangle: Signal<Rectangle> | Rectangle): boolean {
  const value = unsignalify(rectangle as Rectangle);
  return !!(value.width && value.height);
}
