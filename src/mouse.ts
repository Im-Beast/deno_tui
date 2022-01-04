// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { getInteractiveComponents, Tui } from "./tui.ts";
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
 * @param tui – tui which components will be manipulated
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * handleKeypresses(tui);
 * handleMouseControls(tui);
 * ```
 */
export function handleMouseControls(tui: Tui): void {
  Deno.writeSync(tui.canvas.writer.rid, encoder.encode(ENABLE_MOUSE));
  addEventListener("unload", () => {
    Deno.writeSync(tui.writer.rid, encoder.encode(DISABLE_MOUSE));
  });

  tui.on("mouse", ({ x, y, release, button }) => {
    if (release || button !== 0) return;

    const components = getInteractiveComponents(tui);
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

    if (tui.focused.item === item) {
      tui.focused.active = true;
      tui.focused.item?.emit("active");
      tui.focused.item?.active?.();
    }

    tui.focused.item = item;

    if (!tui.focused.active) {
      tui.focused.item?.emit("focus");
      tui.focused.item?.focus?.();
    }
  });
}
