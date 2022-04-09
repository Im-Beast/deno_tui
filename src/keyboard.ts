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
  let item = tui.focused.items[0] || tui.components[0];

  let { row, column } = item?.rectangle;
  row += item?.canvas?.offset?.rows ?? 0;
  column += item?.canvas?.offset?.columns ?? 0;

  const components = getInteractiveComponents(tui);

  if (vector.y !== 0) {
    let vertical = components
      .filter(
        (a) => a === item || (a.rectangle.row + a.canvas.offset.rows !== row),
      )
      .sort(
        (a, b) =>
          (a.rectangle.row + a.canvas.offset.rows) -
          (b.rectangle.row + b.canvas.offset.rows),
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
        column - (component.rectangle.column + component.canvas.offset.columns),
      );
      const distB = Math.abs(
        column - (closest.rectangle.column + closest.canvas.offset.columns),
      );

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
    const controls = tui.keyboardControls;
    if (key === controls.get("activate")) {
      tui.focused.active = true;
      tui.emit("active");
      tui.focused.items[0]?.emit("active");
      tui.focused.items[0]?.active?.();
      return;
    }

    if (!shift || ctrl || meta) return;

    const vector = { x: 0, y: 0 };

    switch (key) {
      case controls.get("up"):
        vector.y -= 1;
        break;
      case controls.get("down"):
        vector.y += 1;
        break;
      case controls.get("left"):
        vector.x -= 1;
        break;
      case controls.get("right"):
        vector.x += 1;
        break;
      default:
        return;
    }

    tui.focused.items = [changeComponent(tui, vector)];
    tui.focused.items[0]?.focus?.();
    tui.emit("focus");
    tui.focused.items[0]?.emit("focus");
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
