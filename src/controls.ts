import { textWidth } from "../mod.ts";
import { Component } from "./component.ts";
import { Tui } from "./tui.ts";
import { MultiKeyPress, Rectangle } from "./types.ts";
import { KeyPress } from "./types.ts";
import { DISABLE_MOUSE, ENABLE_MOUSE } from "./utils/ansi_codes.ts";
import { getComponentClosestToTopLeftCorner } from "./utils/component.ts";
import { clamp, fitsInRectangle } from "./utils/numbers.ts";
import { View, viewInstances } from "./view.ts";

const textEncoder = new TextEncoder();

export let lastSelectedComponent: Component | undefined;
export let currentView: View | undefined;

export function handleControls(tui: Tui): void {
  handleKeyboardControls(tui);
  handleMouseControls(tui);
}

export function handleKeyboardControls(tui: Tui): void {
  const viewText = tui.canvas.drawText({
    rectangle: {
      get column() {
        return tui.canvas.size.columns - textWidth(currentView?.title ?? "");
      },
      row: 0,
    },
    style: tui.style,
    get value() {
      return currentView?.title ?? "";
    },
    zIndex: Number.MAX_SAFE_INTEGER,
  });

  const updateLastSelectedComponent = () => {
    let component = undefined;

    if (currentView) {
      component = currentView.components.find(({ state }) => state !== "base");

      component ??= getComponentClosestToTopLeftCorner(
        tui,
        ({ interact }) => interact !== Component.prototype.interact,
      );
    } else {
      component = tui.components.find(
        ({ state, view }) => state !== "base" && view === undefined,
      );

      component ??= getComponentClosestToTopLeftCorner(
        tui,
        ({ interact, view }) => interact !== Component.prototype.interact && view === undefined,
      );
    }

    return component;
  };

  const keyboardHandler = (keyPress: KeyPress | MultiKeyPress) => {
    const pressedKeys = keyPress.key === "multi" ? keyPress.keys : [keyPress.key];

    if (!(keyPress.ctrl || (pressedKeys.length === 1 && pressedKeys[0] === "return"))) return;

    lastSelectedComponent = updateLastSelectedComponent();

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
          const previousView = currentView;
          currentView = viewInstances[viewIndex];
          viewText.rendered = false;

          if (viewIndex < viewInstances.length && currentView !== previousView) {
            lastSelectedComponent.state = "base";
            return;
          }

          viewText.rendered = false;
          currentView = undefined;
          lastSelectedComponent.state = "base";
          return;
        }
      }
    }

    const lastRectangle = lastSelectedComponent.rectangle!;

    let closest!: [number, Component];
    for (const component of currentView ? currentView.components : tui.components) {
      const { rectangle, interact, view } = component;

      if (
        !!view !== !!currentView || interact === Component.prototype.interact || component === lastSelectedComponent ||
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

      if (view.scrollable) {
        const { horizontal, vertical } = view.scrollbars;

        if (horizontal) horizontal.value = view.offset.x;
        if (vertical) vertical.value = view.offset.x;
      }
    }

    lastSelectedComponent.state = "base";
    closestComponent.interact("keyboard");
    lastSelectedComponent = closestComponent;
  };

  tui.on("keyPress", keyboardHandler);
  tui.on("multiKeyPress", keyboardHandler);
}

export function handleMouseControls(tui: Tui): void {
  Deno.writeSync(tui.stdout.rid, textEncoder.encode(ENABLE_MOUSE));

  tui.on("dispatch", () => {
    Deno.writeSync(tui.stdout.rid, textEncoder.encode(DISABLE_MOUSE));
  });

  tui.on("mousePress", (mousePress) => {
    const { x, y, drag, scroll, shift, meta, ctrl, release } = mousePress;

    if (drag || scroll !== 0 || shift || meta || ctrl) return;

    const possibleComponents: Component[] = [];

    for (const component of tui.components) {
      let { rectangle } = component;
      if (!rectangle) continue;

      const view = component.view;
      if (view) {
        const viewRectangle = view.rectangle;
        const viewOffset = view.offset;

        const viewedRectangle: Rectangle = {
          column: rectangle.column + viewRectangle.column - viewOffset.x,
          row: rectangle.row + viewRectangle.row - viewOffset.y,
          width: rectangle.width,
          height: rectangle.height,
        };

        rectangle = viewedRectangle;
      }

      const fitRectangle = {
        column: rectangle.column,
        row: rectangle.row,
        height: rectangle.height - 1,
        width: rectangle.width - 1,
      };

      if (!fitsInRectangle(x, y, fitRectangle)) {
        continue;
      }

      const candidate = possibleComponents[0];

      if (!possibleComponents.length || component.zIndex > candidate.zIndex) {
        possibleComponents.length = 0;
        possibleComponents.push(component);
      } else if (component.zIndex === candidate.zIndex && component !== candidate) {
        possibleComponents.push(component);
      }
    }

    const impossibleComponents = tui.components.filter((value) => possibleComponents.indexOf(value) === -1);

    for (const component of impossibleComponents) {
      component.state = "base";
    }

    for (const component of possibleComponents) {
      if (!release) {
        component.interact("mouse");
      } else if (component.state === "active") {
        component.state = "base";
      }
    }
  });
}
