// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { KeyPress, readKeypressesEmitter } from "./key_reader.ts";
import { getInteractiveComponents, TuiInstance } from "./tui.ts";
import { clamp, getStaticValue } from "./util.ts";

/**
 * Emit pressed keys to focused objects
 * @param instance - TuiInstance from which keys will be redirected to focused items
 */
export function handleKeypresses(instance: TuiInstance): void {
  instance.emitter.on("key", (keyPress) => {
    instance.selected.item?.emitter.emit("key", keyPress);
  });

  instance.emitter.on("multiKey", (keyPress) => {
    instance.selected.item?.emitter.emit("key", keyPress);
  });

  readKeypressesEmitter(instance.reader, instance.emitter);
}

export const controlsPosition: {
  [id: number]: { x: number; y: number };
} = {};

export function handleKeyboardControls(instance: TuiInstance): void {
  const handler = ({ meta, shift, ctrl, key }: KeyPress) => {
    if (key === "return") {
      instance.selected.active = true;
      instance.selected.item?.emitter.emit("active");
      return;
    }

    if (!shift || ctrl || meta) return;

    let item = instance.selected.item || instance.components[0];

    const { row } = getStaticValue(item?.rectangle);

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

    const components = getInteractiveComponents(instance);

    if (vector.y !== 0) {
      const vertical = components
        .filter(
          (a) => a === item || getStaticValue(a.rectangle).row !== row,
        )
        .sort(
          ({ rectangle: a }, { rectangle: b }) =>
            getStaticValue(a).column - getStaticValue(b).column,
        );

      item = vertical[
        clamp(vertical.indexOf(item) + vector.y, 0, vertical.length - 1)
      ];
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

    instance.selected.focused = true;
    instance.selected.item = item;
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
