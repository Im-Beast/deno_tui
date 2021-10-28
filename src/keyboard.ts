import { KeyPress, readKeypresses } from "./key_reader.ts";
import { TuiInstance } from "./tui.ts";

export const positions: { [instanceId: number]: { x: number; y: number } } = {};

export async function handleKeypresses(instance: TuiInstance) {
  const emit = (keyPress: KeyPress) => {
    instance.emitter.emit("keyPress", keyPress);
    const { component } = instance.components.focused;
    if (component) {
      component.emitter.emit("keyPress", keyPress);
    }
  };

  for await (const keyPresses of readKeypresses(instance.reader)) {
    keyPresses.forEach(emit);

    if (keyPresses.length > 1) {
      emit({
        key: keyPresses.join("+"),
        buffer: keyPresses[0].buffer,
        ctrl: keyPresses.some((kp) => kp.ctrl),
        meta: keyPresses.some((kp) => kp.meta),
        shift: keyPresses.some((kp) => kp.shift),
      });
    }
  }
}

export function handleKeyboardControls(instance: TuiInstance) {
  instance.on("keyPress", (keyPress) => {
    if (!keyPress) return;

    const { focused } = instance.components;

    instance.components.isActive = keyPress.key.includes("return");
    if (instance.components.isActive && focused.component) {
      focused.component.emitter.emit("active");
      instance.emitter.emit("draw");
    }

    if (keyPress.shift) {
      switch (keyPress.key) {
        case "up":
          focusItem(instance, { x: 0, y: -1 });
          break;
        case "down":
          focusItem(instance, { x: 0, y: 1 });
          break;
        case "left":
          focusItem(instance, { x: -1, y: 0 });
          break;
        case "right":
          focusItem(instance, { x: 1, y: 0 });
          break;
      }
    }
  });
}

export function focusItem(
  instance: TuiInstance,
  vector: { x: -1 | 0 | 1; y: -1 | 0 | 1 },
) {
  const { mapping } = instance.components.focusMap;
  const { focused } = instance.components;

  positions[instance.id] ||= { x: 0, y: 0 };
  const position = positions[instance.id];
  position.y = Math.abs((position.y + vector.y) % mapping.length);
  position.x = Math.abs((position.x + vector.x) % mapping[position.y].length);

  instance.emitter.emit("draw");

  focused.id = mapping[position.y][position.x].id;
  focused.component = mapping[position.y][position.x];

  focused.component.emitter.emit("focus");
}
