// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "./tui.ts";

import { KeypressEvent, MousePressEvent, MultiKeyPressEvent } from "./events.ts";
import { MultiKeyPress, readKeypresses } from "./key_reader.ts";

import { Component } from "./component.ts";
import { LabelComponent } from "./components/label.ts";
import { ViewComponent } from "./components/view.ts";

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
 * CTRL+F keys switches between views, to get back to default press the same CTRL+F key again.
 * Just Enter (Return) calls `interact("keyboard")` on focused component.
 * It's up to component how it handles it.
 */
export function handleKeyboardControls(tui: Tui): void {
  let lastSelectedComponent: Component;

  let currentView: ViewComponent | undefined = undefined;
  const temporaryComponents: Component[] = [];

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

            for (const component of temporaryComponents) {
              component.remove();
            }

            if (currentView === newView) currentView = undefined;
            else if (newView) {
              const viewText = `View ${index} col:${newView.rectangle.column}, row:${newView.rectangle.row} `;

              const rectangle = () => ({
                column: tui.canvas.size.columns - viewText.length,
                row: 0,
                height: -1,
                width: -1,
              });

              const viewLabel = new LabelComponent({
                tui,
                theme: {
                  base: tui.style,
                },
                align: { horizontal: "left", vertical: "top" },
                rectangle: rectangle(),
                value: viewText,
              });

              temporaryComponents.push(viewLabel);

              tui.canvas.addEventListener("resize", () => {
                viewLabel.rectangle = rectangle();
              });

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

    let possibleComponents: Component[] = [];
    const lastRectangle = lastSelectedComponent.rectangle;

    for (const component of tui.components) {
      if (
        component === lastSelectedComponent ||
        component.interact === Component.prototype.interact ||
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

    possibleComponents.sort((a, b) => b.zIndex - a.zIndex);
    possibleComponents = possibleComponents.filter((a) => a.zIndex === possibleComponents[0].zIndex);

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
