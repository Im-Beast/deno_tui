import { DISABLE_MOUSE, ENABLE_MOUSE } from "./ansi_codes.ts";
import { Component } from "./component.ts";
import { Tui } from "./tui.ts";
import { fits } from "./util.ts";
import type { ViewedComponent } from "./components/view.ts";

const encoder = new TextEncoder();

export function handleMouseControls(tui: Tui) {
  Deno.writeSync(tui.stdout.rid, encoder.encode(ENABLE_MOUSE));

  tui.addEventListener("close", () => {
    Deno.writeSync(tui.stdout.rid, encoder.encode(DISABLE_MOUSE));
  });

  tui.addEventListener("mousePress", ({ detail: { x, y, drag, scroll, shift, meta, ctrl, release } }) => {
    if (drag || scroll !== 0 || shift || meta || ctrl) return;

    const possibleComponents: Component[] = [];

    for (const component of tui.components) {
      const viewedComponent = component as unknown as ViewedComponent;
      if (!viewedComponent.rectangle) continue;

      let { column, row, width, height } = viewedComponent.rectangle;

      const view = viewedComponent.tui.view;
      if (view && view !== viewedComponent) {
        const { column: viewColumn, row: viewRow } = viewedComponent.tui.view.rectangle;
        const { x: xOffset, y: yOffset } = viewedComponent.tui.view.offset;
        column += viewColumn - xOffset;
        row += viewRow - yOffset;
      }

      if (!fits(x, column, column + width - 1) || !fits(y, row, row + height - 1)) {
        continue;
      }

      const candidate = possibleComponents[0];

      if (!possibleComponents.length || viewedComponent.zIndex > candidate.zIndex) {
        possibleComponents.length = 0;
        possibleComponents.push(component);
      } else if (viewedComponent.zIndex === candidate.zIndex) {
        possibleComponents.push(component);
      }
    }

    const impossibleComponents = tui.components.filter((value) => possibleComponents.indexOf(value) === -1);

    for (const component of impossibleComponents) {
      if (component.state !== "base") {
        component.resetState = true;
      }
    }

    for (const component of possibleComponents) {
      if (!release) {
        component.interact();
        component.resetState = false;
      } else if (component.state === "active") {
        component.resetState = true;
      }
    }
  });
}
