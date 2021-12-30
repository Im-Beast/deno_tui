// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { KeyPress } from "./key_reader.ts";
import { getInteractiveComponents, Tui } from "./tui.ts";
import { AnyComponent } from "./types.ts";
import { clamp } from "./util.ts";

/**
 * Change focused component using 2 axis vector
 * @param tui – tui which components will be manipulated
 * @param vector – object which holds x and y (they should equal -1 or 0 or 1)
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * changeComponent(tui, { x: 1, y: 1});
 * ```
 */
export function changeComponent(
  tui: Tui,
  vector: { x: number; y: number },
): AnyComponent {
  let item = tui.focused.item || tui.components[0];

  const { row, column } = item?.rectangle;

  const components = getInteractiveComponents(tui);

  if (vector.y !== 0) {
    let vertical = components
      .filter(
        (a) => a === item || a.rectangle.row !== row,
      )
      .sort(
        ({ rectangle: a }, { rectangle: b }) => a.row - b.row,
      );

    vertical = vertical.filter(({ rectangle: a }) =>
      a.row ===
        vertical[
          clamp(vertical.indexOf(item) + vector.y, 0, vertical.length - 1)
        ].rectangle.row
    );

    let closest!: AnyComponent;
    for (const component of vertical) {
      if (!closest) {
        closest = component;
        continue;
      }

      const distA = Math.abs(
        column - component.rectangle.column,
      );
      const distB = Math.abs(column - closest.rectangle.column);

      if (distA < distB) {
        closest = component;
      } else if (distA === distB) {
        closest = component.drawPriority > closest.drawPriority
          ? component
          : closest;
      }
    }

    item = closest;
  }

  if (vector.x !== 0) {
    const horizontal = components
      .filter(
        ({ rectangle: a }) => a.row === row,
      )
      .sort(
        ({ rectangle: a }, { rectangle: b }) => a.column - b.column,
      );

    item = horizontal[
      clamp(horizontal.indexOf(item) + vector.x, 0, horizontal.length - 1)
    ];
  }

  return item;
}

/**
 * Handle keyboard controls
 *  - Hold shift + press up/down/left/right to move between components
 *  - Press enter to activate item
 * @param tui – Tui of which components will be manipulated
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * handleKeypresses(tui);
 * handleKeyboardControls(tui);
 * ```
 */
export function handleKeyboardControls(tui: Tui): void {
  const handler = ({ meta, shift, ctrl, key }: KeyPress) => {
    if (key === "return") {
      tui.focused.active = true;
      tui.focused.item?.emit("active");
      tui.focused.item?.active?.();
      return;
    }

    if (!shift || ctrl || meta) return;

    const vector = { x: 0, y: 0 };

    switch (key) {
      case "up":
        vector.y -= 1;
        break;
      case "down":
        vector.y += 1;
        break;
      case "left":
        vector.x -= 1;
        break;
      case "right":
        vector.x += 1;
        break;
    }

    tui.focused.item = changeComponent(tui, vector);
    tui.focused.item?.focus?.();
    tui.focused.item?.emit("focus");
  };

  tui.on("key", handler);
  tui.on("multiKey", ({ keys, meta, shift, ctrl, buffer }) => {
    for (const i in keys) {
      handler({
        key: keys[i],
        buffer: buffer[i],
        meta,
        shift,
        ctrl,
      });
    }
  });
}
