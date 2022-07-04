import { DISABLE_MOUSE, ENABLE_MOUSE } from "./ansi_codes.ts";
import { Tui } from "./tui.ts";
import { clamp } from "./util.ts";

const encoder = new TextEncoder();

export function handleMouseControls(tui: Tui) {
  Deno.writeSync(tui.stdout.rid, encoder.encode(ENABLE_MOUSE));

  addEventListener("unload", () => {
    Deno.writeSync(tui.stdout.rid, encoder.encode(DISABLE_MOUSE));
  });

  tui.addEventListener("mousePress", ({ detail: mousePress }) => {
    const { x, y, drag, release } = mousePress;

    if (drag) return;

    for (const component of tui.components) {
      if (!component.rectangle) continue;
      const { column, row, width, height } = component.rectangle;

      if (
        clamp(x, column, column + width - 1) !== x ||
        clamp(y, row, row + height - 1) !== y
      ) {
        continue;
      }

      if (!release) {
        for (const component of tui.components) {
          if (component.state !== "focused") continue;
          component.resetState = true;
        }

        component.interact();
        component.resetState = false;
      } else if (component.state !== "focused") {
        component.resetState = true;
      }
    }
  });
}
