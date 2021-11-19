import { readKeypressesEmitter } from "./key_reader.ts";
import { TuiInstance } from "./tui.ts";
import { AnyComponent } from "./types.ts";
import { getStaticValue } from "./util.ts";

export function handleKeypresses(instance: TuiInstance) {
  instance.emitter.on("key", (keyPress) => {
    instance.selected.item?.emitter.emit("key", keyPress);
  });

  instance.emitter.on("multiKey", (keyPress) => {
    instance.selected.item?.emitter.emit("key", keyPress);
  });

  readKeypressesEmitter(instance.reader, instance.emitter);
}

export const controlsPosition: {
  [id: number]: { x: number; y: number; heldEnter: number };
} = {};

// TODO: Make it actually good
export function handleKeyboardControls(instance: TuiInstance) {
  controlsPosition[instance.id] ||= {
    x: 0,
    y: 0,
    heldEnter: 0,
  };

  const position = controlsPosition[instance.id];

  instance.on("key", ({ key, ctrl, shift, meta }) => {
    let { item } = instance.selected;

    if (key === "return" && !shift && !ctrl && !meta) {
      instance.selected.active = true;
      item?.emitter.emit("active");
      position.heldEnter = Date.now();
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

    if (vector.x === 0 && vector.y === 0) return;

    position.x += vector.x;
    position.y += vector.y;

    position.x = Math.max(0, position.x);
    position.y = Math.max(0, position.y);

    const interactiveComponents = instance.components.filter((
      { interactive },
    ) => interactive);

    item ||= interactiveComponents[0];

    const _mapping: AnyComponent[][] = [];
    for (
      const component of interactiveComponents.sort((a, b) =>
        getStaticValue(a.rectangle).row -
        getStaticValue(b.rectangle).row
      )
    ) {
      _mapping[getStaticValue(component.rectangle).row] ||= [];
      _mapping[getStaticValue(component.rectangle).row].push(
        component,
      );
    }

    for (const row in _mapping) {
      _mapping[row] = _mapping[row].sort((a, b) =>
        getStaticValue(a.rectangle).column -
        getStaticValue(b.rectangle).column
      );
    }

    const mapping: AnyComponent[][] = [];

    let i = 0;
    for (const components of _mapping) {
      if (!components) continue;
      mapping[i++] = components;
    }

    item ||= mapping[0][0];
    if (!item) return;

    const y = mapping[position.y % mapping.length];
    item = y[position.x % y.length];

    instance.selected.item = item;
    instance.selected.focused = true;
    instance.selected.item.emitter.emit("focus");
  });
}
