// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "./tui.ts";

import { KeyPressEvent, MousePressEvent, MultiKeyPressEvent } from "./events.ts";
import { MultiKeyPress, readKeypresses } from "./key_reader.ts";

import { Component } from "./component.ts";
import { LabelComponent } from "./components/label.ts";
import { ViewComponent } from "./components/view.ts";
import { getComponentClosestToTopLeftCorner } from "./utils/component.ts";
import { clamp } from "./utils/numbers.ts";
import { ScrollableViewComponent } from "./components/scrollable_view.ts";

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
      tui.dispatchEvent(keyPress.key === "mouse" ? new MousePressEvent(keyPress) : new KeyPressEvent(keyPress));

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
  const viewLabel = new LabelComponent({
    tui,
    theme: {
      base: tui.style,
    },
    align: { vertical: "top", horizontal: "left" },
    rectangle: { column: 10, row: 0, width: -1, height: -1 },
    value: "",
  });

  Object.defineProperty(viewLabel, "rectangle", {
    get(this: LabelComponent) {
      const textLength = this.value.length;
      return {
        column: tui.canvas.size.columns - textLength,
        row: 0,
        width: textLength,
        height: -1,
      };
    },
  });

  tui.addEventListener(["keyPress", "multiKeyPress"], (event) => {
    const [keyPress, pressedKeys] = event instanceof MultiKeyPressEvent
      ? [event.multiKeyPress, event.multiKeyPress.keys]
      : [event.keyPress, [event.keyPress.key]];

    if (!(keyPress.ctrl || (pressedKeys.length === 1 && pressedKeys[0] === "return"))) return;

    lastSelectedComponent ??= tui.components.find(
      ({ state }) => state === "focused",
    ) ?? getComponentClosestToTopLeftCorner(tui, true);

    const moveVector = { x: 0, y: 0 };

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
        default: {
          if (!/f(\d+)/.test(key)) return;
          const viewIndex = +key.replace("f", "") - 1;
          const views = tui.components.filter((component) => component instanceof ViewComponent) as ViewComponent[];
          const previousView = currentView;

          currentView = views[viewIndex];
          if (viewIndex >= views.length || currentView === previousView) {
            if (currentView) currentView.state = "base";
            currentView = undefined;
            viewLabel.value = "";
            return;
          }

          currentView.interact();
          viewLabel.value = `View ${viewIndex}`;
          return;
        }
      }
    }

    const lastRectangle = lastSelectedComponent.rectangle!;

    let closest!: [number, Component];
    for (const component of tui.components) {
      const { rectangle, view, interact } = component;

      if (
        interact === Component.prototype.interact ||
        component === lastSelectedComponent ||
        view !== currentView ||
        !rectangle
      ) {
        continue;
      }

      const distance = (
        (lastRectangle.column - rectangle.column) ** 2 +
        (lastRectangle.row - rectangle.row) ** 2
      ) ** 0.5;

      if (
        (!closest || distance < closest[0] || (distance === closest[0] && component.zIndex > closest[1].zIndex)) &&
        (
          (moveVector.x === 1 && rectangle.column > lastRectangle.column) ||
          (moveVector.x === -1 && rectangle.column < lastRectangle.column) ||
          moveVector.x === 0
        ) && (
          (moveVector.y === 1 && rectangle.row > lastRectangle.row) ||
          (moveVector.y === -1 && rectangle.row < lastRectangle.row) ||
          moveVector.y === 0
        )
      ) {
        closest = [distance, component];
      }
    }

    if (!closest) return;

    const closestComponent = closest[1];

    const { view } = closestComponent;
    if (view) {
      const { row, column } = closestComponent.rectangle!;

      view.offset.x = clamp(column, 0, view.maxOffset.x);
      view.offset.y = clamp(row, 0, view.maxOffset.y);

      if (view instanceof ScrollableViewComponent) {
        const { horizontal, vertical } = view.scrollbars;

        if (horizontal) horizontal.value = view.offset.x;
        if (vertical) vertical.value = view.offset.x;
      }
    }

    lastSelectedComponent.state = "base";
    closestComponent.interact("keyboard");
    lastSelectedComponent = closestComponent;
  });
}
