import { Component } from "./component.ts";
import { FakeTui } from "./components/view.ts";
import { KeypressEvent, MousePressEvent, MultiKeyPressEvent } from "./events.ts";
import { MultiKeyPress, readKeypresses } from "./key_reader.ts";
import { Tui } from "./tui.ts";

export async function handleKeypresses(tui: Tui): Promise<void> {
  for await (const keyPresses of readKeypresses(tui.stdin)) {
    const multiKeyPress: MultiKeyPress = {
      keys: [],
      buffer: [],
      ctrl: false,
      meta: false,
      shift: false,
    };

    for (const keyPress of keyPresses) {
      tui.dispatchEvent(keyPress.key === "mouse" ? new MousePressEvent(keyPress) : new KeypressEvent(keyPress));

      multiKeyPress.keys.push(keyPress.key);
      multiKeyPress.buffer.push(keyPress.buffer);
      multiKeyPress.shift ||= keyPress.shift;
      multiKeyPress.meta ||= keyPress.meta;
      multiKeyPress.ctrl ||= keyPress.ctrl;
    }

    if (multiKeyPress.keys.length > 1) {
      tui.dispatchEvent(new MultiKeyPressEvent(multiKeyPress));
    }
  }
}

export function handleKeyboardControls(tui: Tui): void {
  let lastSelectedComponent: Component;
  tui.addEventListener(["keyPress", "multiKeyPress"], (event) => {
    const [keyPress, pressedKeys] = event instanceof MultiKeyPressEvent
      ? [event.multiKeyPress, event.multiKeyPress.keys]
      : [event.keyPress, [event.keyPress.key]];

    if (!keyPress.ctrl && !pressedKeys.includes("return")) return;

    lastSelectedComponent ??= tui.components[0];

    const moveVector = {
      x: 0,
      y: 0,
    };

    for (const key of pressedKeys) {
      switch (key) {
        case "up":
          --moveVector.y;
          break;
        case "down":
          ++moveVector.y;
          break;
        case "left":
          --moveVector.x;
          break;
        case "right":
          ++moveVector.x;
          break;
        case "return":
          lastSelectedComponent.interact("keyboard");
          return;
        default:
          return;
      }
    }

    if (!lastSelectedComponent) {
      lastSelectedComponent = tui.components.find((x) => x.rectangle !== undefined)!;
    }
    if (!lastSelectedComponent.rectangle) return;

    const possibleComponents: Component[] = [];
    const lastRectangle = lastSelectedComponent.rectangle;

    for (const component of tui.components) {
      // TODO: Handle keyboard controls in views
      // Proposed option: Ctrl+F-keys switch between views and then you can control them using normal controls?
      // This should then display info somewhere (presumably right-top corner about current view)
      if (
        component.interact === Component.prototype.interact ||
        (component.tui as FakeTui).realTui
      ) {
        continue;
      }

      const { rectangle } = component;
      if (!rectangle || component === lastSelectedComponent) continue;

      if (
        (
          moveVector.y === 0 ||
          (moveVector.y > 0 && rectangle.row > lastRectangle.row) ||
          (moveVector.y < 0 && rectangle.row < lastRectangle.row)
        ) &&
        (
          moveVector.x === 0 ||
          (moveVector.x > 0 && rectangle.column > lastRectangle.column) ||
          (moveVector.x < 0 && rectangle.column < lastRectangle.column)
        )
      ) {
        possibleComponents.push(component);
      }
    }

    if (!possibleComponents.length) return;

    let closest!: Component;

    let closestDistance!: number;
    for (const component of possibleComponents) {
      const distance = Math.sqrt(
        Math.pow(lastSelectedComponent.rectangle!.column - component.rectangle!.column, 2) +
          Math.pow(lastSelectedComponent.rectangle!.row - component.rectangle!.row, 2),
      );

      if (!closest || distance < closestDistance) {
        closest = component;
        closestDistance = distance;
      }
    }

    lastSelectedComponent.state = "base";
    closest.state = "focused";
    lastSelectedComponent = closest;
  });
}
