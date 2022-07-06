import { DISABLE_MOUSE, ENABLE_MOUSE } from "./ansi_codes.ts";
import { Component } from "./component.ts";
import { Tui } from "./tui.ts";
import { clamp } from "./util.ts";

const encoder = new TextEncoder();

export function handleMouseControls(tui: Tui) {
  Deno.writeSync(tui.stdout.rid, encoder.encode(ENABLE_MOUSE));

  tui.addEventListener("close", () => {
    Deno.writeSync(tui.stdout.rid, encoder.encode(DISABLE_MOUSE));
  });

  tui.addEventListener("mousePress", ({ detail: mousePress }) => {
    const { x, y, drag, release } = mousePress;

    if (drag) return;

    const possibleComponents: Component[] = [];

    for (const component of tui.components) {
      if (!component.rectangle) continue;
      const { column, row, width, height } = component.rectangle;

      if (
        clamp(x, column, column + width - 1) !== x ||
        clamp(y, row, row + height - 1) !== y
      ) {
        continue;
      }

      const candidate = possibleComponents[0];

      if (!possibleComponents.length || component.zIndex > candidate.zIndex) {
        possibleComponents.length = 0;
        possibleComponents.push(component);
      } else if (component.zIndex === candidate.zIndex) {
        possibleComponents.push(component);
      }
    }

    if (!release) {
      for (const component of tui.components) {
        if (component.state !== "focused") continue;
        component.resetState = true;
      }
    }

    for (const component of possibleComponents) {
      if (!release) {
        component.interact();
        component.resetState = false;
      } else if (component.state !== "focused") {
        component.resetState = true;
      }
    }
  });
}
