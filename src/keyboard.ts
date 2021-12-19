// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { KeyPress } from "./key_reader.ts";
import { getInteractiveComponents, TuiInstance } from "./tui.ts";
import { AnyComponent } from "./types.ts";
import { clamp, getStaticValue } from "./util.ts";

/**
 * Change focused component using 2 axis vector
 * @param instance – instance which components will be manipulated
 * @param vector – object which holds x and y (they should equal -1 or 0 or 1)
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * changeComponent(tui, { x: 1, y: 1});
 * ```
 */
export function changeComponent(
  instance: TuiInstance,
  vector: { x: number; y: number },
): AnyComponent {
  let item = instance.selected.item || instance.components[0];

  const { row, column } = getStaticValue(item?.rectangle);

  const components = getInteractiveComponents(instance);

  if (vector.y !== 0) {
    let vertical = components
      .filter(
        (a) => a === item || getStaticValue(a.rectangle).row !== row,
      )
      .sort(
        ({ rectangle: a }, { rectangle: b }) =>
          getStaticValue(a).row - getStaticValue(b).row,
      );

    vertical = vertical.filter(({ rectangle: a }) =>
      getStaticValue(a).row ===
        getStaticValue(
          vertical[
            clamp(vertical.indexOf(item) + vector.y, 0, vertical.length - 1)
          ].rectangle,
        ).row
    );

    let closest!: AnyComponent;
    for (const component of vertical) {
      if (!closest) {
        closest = component;
        continue;
      }

      const distA = Math.abs(
        column - getStaticValue(component.rectangle).column,
      );
      const distB = Math.abs(column - getStaticValue(closest.rectangle).column);

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
        ({ rectangle: a }) => getStaticValue(a).row === row,
      )
      .sort(
        ({ rectangle: a }, { rectangle: b }) =>
          getStaticValue(a).column - getStaticValue(b).column,
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
 * @param instance – instance which components will be manipulated
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * handleKeypresses(tui);
 * handleKeyboardControls(tui);
 * ```
 */
export function handleKeyboardControls(instance: TuiInstance): void {
  const handler = ({ meta, shift, ctrl, key }: KeyPress) => {
    if (key === "return") {
      instance.selected.active = true;
      instance.selected.item?.emitter.emit("active");
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

    instance.selected.focused = true;
    instance.selected.item = changeComponent(instance, vector);
  };

  instance.on("key", handler);
  instance.on("multiKey", ({ keys, meta, shift, ctrl, buffer }) => {
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
