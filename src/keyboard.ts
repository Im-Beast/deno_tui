// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component } from "./component.ts";
import { ViewComponent } from "./components/view.ts";
import { KeypressEvent, MousePressEvent, MultiKeyPressEvent } from "./events.ts";
import { MultiKeyPress, readKeypresses } from "./key_reader.ts";
import { Tui } from "./tui.ts";

/**
 * Intercepts keypresses from `readKeypress()` and dispatch them as events to `tui`
 * that way keyPress, multiKeyPress and mousePress events work
 */
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

/**
 * `handleKeypresses()` has to be called in order for this function to work.
 * CTRL+Arrows moves focus in appropriate direction.
 * Just Enter (Return) calls `interact("keyboard")` on focused component.
 * It's up to component how it handles it.
 */
export function handleKeyboardControls(tui: Tui): void {
  let lastSelectedComponent: Component;
  let currentView: ViewComponent;

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
          if (/f(\d+)/.test(key)) {
            const views = tui.components.filter((component) => component instanceof ViewComponent) as ViewComponent[];
            const index = +key.replace("f", "") - 1;
            const newView = views[index];
            if (newView) {
              // TODO: Display currently selected view somewhere in the TUI
              currentView = newView;
              const newComponent = currentView.components?.[0];

              if (newComponent) {
                lastSelectedComponent.state = "base";
                lastSelectedComponent = newComponent;
                newComponent.state = "focused";
              }
            }
          }
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
      if (
        component === lastSelectedComponent || component.interact === Component.prototype.interact ||
        component.view !== currentView
      ) {
        continue;
      }

      const { rectangle } = component;
      if (!rectangle) {
        continue;
      }

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

    // TODO: Make this a little bit smarter,
    // Offset should be set that component could be clearly seen
    // Preferably also centered but not just stuck to the corner
    const { view } = closest;
    if (view) {
      const { row, column } = closest.rectangle!;
      view.offset.x = column;
      view.offset.y = row;
    }

    lastSelectedComponent.state = "base";
    closest.state = "focused";
    lastSelectedComponent = closest;
  });
}
