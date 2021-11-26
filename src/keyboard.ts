import { KeyPress, readKeypressesEmitter } from "./key_reader.ts";
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
  [id: number]: { x: number; y: number };
} = {};

// TODO: Make it actually good
export function handleKeyboardControls(instance: TuiInstance) {
  controlsPosition[instance.id] ||= {
    x: 0,
    y: 0,
  };

  const position = controlsPosition[instance.id];

  const handler = ({ key, ctrl, shift, meta }: KeyPress) => {
    let { item } = instance.selected;

    if (key === "return" && !shift && !ctrl && !meta) {
      instance.selected.active = true;
      item?.emitter.emit("active");
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

    if (vector.x === 0 && vector.y === 0) return;

    position.x += vector.x;
    position.y += vector.y;

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
      const rectangle = getStaticValue(component.rectangle);
      _mapping[rectangle.row] ||= [];
      _mapping[rectangle.row].push(
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

    if (position.y >= mapping.length) {
      position.y = 0;
    } else if (position.y < 0) {
      position.y = mapping.length - 1;
    }

    let y = mapping[position.y];

    if (position.x >= y.length) {
      position.y += 1;
      y = mapping[position.y];
      if (!y) {
        position.y = 0;
        y = mapping[position.y];
      }
      position.x = 0;
    } else if (position.x < 0) {
      position.y -= 1;
      y = mapping[position.y];
      if (!y) {
        position.y = mapping.length - 1;
        y = mapping[position.y];
      }
      position.x = y.length - 1;
    }

    item = y[position.x];

    instance.selected.item = item;
    instance.selected.focused = true;
    instance.selected.item.emitter.emit("focus");
  };

  instance.emitter.on("key", handler);
  instance.emitter.on("multiKey", ({ keys, meta, shift, ctrl, buffer }) => {
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
