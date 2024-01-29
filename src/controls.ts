// Copyright 2023 Im-Beast. MIT license.
import { Component } from "./component.ts";
import { Tui } from "./tui.ts";
import { DISABLE_MOUSE, ENABLE_MOUSE } from "./utils/ansi_codes.ts";
import { getComponentClosestToTopLeftCorner, isInteractable } from "./utils/component.ts";
import { fitsInRectangle } from "./utils/numbers.ts";

const textEncoder = new TextEncoder();

let lastSelectedComponent: Component;

/**
 * Enable handling of controlling Tui using keyboard
 */
export function handleKeyboardControls(tui: Tui): void {
  tui.on("keyPress", ({ key, ctrl, shift, meta }) => {
    if ((!ctrl && key !== "return") || shift || meta) return;

    lastSelectedComponent ??= getComponentClosestToTopLeftCorner(
      tui,
      (object) => isInteractable(object) && object.visible.peek(),
    );

    if (!lastSelectedComponent) return;

    let vectorX = 0;
    let vectorY = 0;

    switch (key) {
      case "return":
        lastSelectedComponent.interact("keyboard");
        return;
      case "up":
        --vectorY;
        break;
      case "down":
        ++vectorY;
        break;
      case "left":
        --vectorX;
        break;
      case "right":
        ++vectorX;
        break;
      default:
        return;
    }

    const lastRectangle = lastSelectedComponent.rectangle.peek();

    let bestCandidate: Component | undefined = undefined;
    let bestCandidateDistance;

    for (const component of tui.components) {
      if (
        component === lastSelectedComponent ||
        !component.visible ||
        component.subComponentOf ||
        !isInteractable(component)
      ) {
        continue;
      }

      const rectangle = component.rectangle.peek();
      if (
        !(
          (vectorX === 1 && rectangle.column > lastRectangle.column) ||
          (vectorX === -1 && rectangle.column < lastRectangle.column) ||
          vectorX === 0
        ) || !(
          (vectorY === 1 && rectangle.row > lastRectangle.row) ||
          (vectorY === -1 && rectangle.row < lastRectangle.row) ||
          vectorY === 0
        )
      ) continue;

      const distance = (
        (lastRectangle.column - rectangle.column) ** 2 +
        (lastRectangle.row - rectangle.row) ** 2
      ) ** 0.5;

      if (
        !bestCandidateDistance || distance < bestCandidateDistance ||
        (bestCandidate && distance <= bestCandidateDistance && component.zIndex > bestCandidate.zIndex)
      ) {
        bestCandidate = component;
        bestCandidateDistance = distance;
      }
    }

    if (!bestCandidate) return;

    bestCandidate.state.value = "focused";
    lastSelectedComponent.state.value = "base";
    lastSelectedComponent = bestCandidate;
  });
}

/**
 * Enable handling of controlling Tui using mouse
 */
export function handleMouseControls(tui: Tui): void {
  const { stdout } = tui;
  stdout.writeSync(textEncoder.encode(ENABLE_MOUSE));
  tui.on("destroy", () => {
    stdout.writeSync(textEncoder.encode(DISABLE_MOUSE));
  });

  tui.on("mousePress", ({ x, y, drag, shift, meta, ctrl, release }) => {
    lastSelectedComponent ??= getComponentClosestToTopLeftCorner(
      tui,
      (object) => isInteractable(object) && object.visible.peek(),
    );

    if (!lastSelectedComponent || shift || meta || ctrl || drag) return;

    let bestCandidate: Component | undefined = undefined;
    for (const component of tui.components) {
      if (
        !component.visible.peek() ||
        component.subComponentOf ||
        !isInteractable(component) ||
        !fitsInRectangle(x, y, component.rectangle.peek())
      ) {
        continue;
      }

      if (!bestCandidate) {
        bestCandidate = component;
        continue;
      }

      if (bestCandidate.zIndex.peek() > component.zIndex.peek()) continue;

      bestCandidate = component;
    }

    if (!bestCandidate) {
      lastSelectedComponent.state.value = "base";
      return;
    } else if (bestCandidate !== lastSelectedComponent) {
      lastSelectedComponent.state.value = "base";
    }

    if (!release) {
      bestCandidate.interact("mouse");
    } else if (bestCandidate.state.peek() === "active") {
      bestCandidate.state.value = "base";
    }

    lastSelectedComponent = bestCandidate;
  });
}
