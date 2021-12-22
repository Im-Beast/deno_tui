// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { getInteractiveComponents, TuiInstance } from "./tui.ts";
import { AnyComponent } from "./types.ts";
import { clamp } from "./util.ts";

/** ASCII escape code to enable mouse handling */
export const ENABLE_MOUSE = "\x1b[?1000h";
/** ASCII escape code to disable mouse handling */
export const DISABLE_MOUSE = "\x1b[?1000l";

const encoder = new TextEncoder();

/**
 * Handle mouse controls
 *  - Single click to focus component
 *  - Double click/Single click focused component to activate
 * @param instance – instance which components will be manipulated
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * handleKeypresses(tui);
 * handleMouseControls(tui);
 * ```
 */
export function handleMouseControls(instance: TuiInstance): void {
  Deno.writeSync(instance.canvas.writer.rid, encoder.encode(ENABLE_MOUSE));
  addEventListener("unload", () => {
    Deno.writeSync(instance.writer.rid, encoder.encode(DISABLE_MOUSE));
  });

  instance.on("mouse", ({ x, y, release, button }) => {
    if (release || button !== 0) return;

    const components = getInteractiveComponents(instance);
    let item!: AnyComponent;

    for (const component of components) {
      const { column, height, row, width } = component.rectangle;

      if (
        clamp(x, column, column + width - 1) === x &&
        clamp(y, row, row + height - 1) === y &&
        (!item || component.drawPriority > item.drawPriority)
      ) {
        item = component;
      }
    }

    if (instance.selected.item === item) {
      instance.selected.active = true;
      instance.selected.item?.emitter.emit("active");
    }

    instance.selected.item = item;
    instance.selected.focused = true;

    if (!instance.selected.active) {
      instance.selected.item?.emitter.emit("focus");
    }
  });
}
