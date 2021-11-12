import { readKeypressesEmitter } from "./key_reader.ts";
import { TuiInstance } from "./tui.ts";
import { AnyComponent } from "./tui_component.ts";

export function handleKeypresses(instance: TuiInstance) {
  instance.emitter.on("key", (keyPress) => {
    instance.selected.item?.emitter.emit("key", keyPress);
  });

  instance.emitter.on("multiKey", (keyPress) => {
    instance.selected.item?.emitter.emit("key", keyPress);
  });

  readKeypressesEmitter(instance.reader, instance.emitter);
}

export const controlsPosition: { [id: number]: { x: number; y: number } } = {};

// TODO: Make it actually good
export function handleKeyboardControls(instance: TuiInstance) {
  controlsPosition[instance.id] ||= {
    x: 0,
    y: 0,
  };

  const position = controlsPosition[instance.id];
  let { item } = instance.selected;

  instance.on("key", ({ key, ctrl, shift, meta }) => {
    if (!shift || ctrl || meta) return;

    const vector = { x: 0, y: 0 };
    switch (key) {
      case "return":
        if (item) {
          instance.selected.active = true;
          item.emitter.emit("active");

          setTimeout(() => {
            instance.selected.active = false;
          }, 100);
        }
        return;
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

    item ||= instance.interactiveComponents[0];

    const _mapping: AnyComponent[][] = [];
    for (
      const component of instance.interactiveComponents.sort((a, b) =>
        a.staticRectangle.row - b.staticRectangle.row
      )
    ) {
      _mapping[component.staticRectangle.row] ||= [];
      _mapping[component.staticRectangle.row].push(component);
    }

    for (const row in _mapping) {
      _mapping[row] = _mapping[row].sort((a, b) =>
        a.staticRectangle.column - b.staticRectangle.column
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
