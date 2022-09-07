// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "./tui.ts";
import { Component } from "./component.ts";

import { DISABLE_MOUSE, ENABLE_MOUSE } from "./utils/ansi_codes.ts";
import { fitsInRectangle } from "./utils/numbers.ts";

import type { Rectangle } from "./types.ts";

const encoder = new TextEncoder();

/**
 * `handleKeypresses()` has to be called in order for this function to work.
 * Clicking component calls `interact("mouse")` on it.
 * It's up to component how it handles it.
 */
export function handleMouseControls(tui: Tui): void {
  Deno.writeSync(tui.stdout.rid, encoder.encode(ENABLE_MOUSE));

  tui.on("close", () => {
    Deno.writeSync(tui.stdout.rid, encoder.encode(DISABLE_MOUSE));
  });

  tui.on("mousePress", (mousePress) => {
    const { x, y, drag, scroll, shift, meta, ctrl, release } = mousePress;

    if (drag || scroll !== 0 || shift || meta || ctrl) return;

    const possibleComponents: Component[] = [];

    for (const component of tui.components) {
      let { rectangle } = component;
      if (!rectangle) continue;

      const view = component.view;
      if (view) {
        const viewRectangle = view.rectangle;
        const viewOffset = view.offset;

        const viewedRectangle: Rectangle = {
          column: rectangle.column + viewRectangle.column - viewOffset.x,
          row: rectangle.row + viewRectangle.row - viewOffset.y,
          width: rectangle.width,
          height: rectangle.height,
        };

        rectangle = viewedRectangle;
      }

      const fitRectangle = {
        column: rectangle.column,
        row: rectangle.row,
        height: rectangle.height - 1,
        width: rectangle.width - 1,
      };

      if (!fitsInRectangle(x, y, fitRectangle)) {
        continue;
      }

      const candidate = possibleComponents[0];

      if (!possibleComponents.length || component.zIndex > candidate.zIndex) {
        possibleComponents.length = 0;
        possibleComponents.push(component);
      } else if (component.zIndex === candidate.zIndex && component !== candidate) {
        possibleComponents.push(component);
      }
    }

    const impossibleComponents = tui.components.filter((value) => possibleComponents.indexOf(value) === -1);

    for (const component of impossibleComponents) {
      component.state = "base";
    }

    for (const component of possibleComponents) {
      if (!release) {
        component.interact("mouse");
      } else if (component.state === "active") {
        component.state = "base";
      }
    }
  });
}
