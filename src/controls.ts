import { Component } from "./component.ts";
import { Tui } from "./tui.ts";
import { DISABLE_MOUSE, ENABLE_MOUSE } from "./utils/ansi_codes.ts";
import { getComponentClosestToTopLeftCorner, isInteractable } from "./utils/component.ts";
import { fitsInRectangle } from "./utils/numbers.ts";

const textEncoder = new TextEncoder();

let lastSelectedComponent!: Component;

export function handleKeyboardControls(tui: Tui): void {
  tui.on("keyPress", ({ key, ctrl, shift, meta }) => {
    if ((!ctrl && key !== "return") || shift || meta) return;

    lastSelectedComponent ??= getComponentClosestToTopLeftCorner(tui, isInteractable);

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

    const { rectangle: lastRectangle } = lastSelectedComponent;

    let bestCandidate: Component | undefined = undefined;
    let bestCandidateDistance;

    for (const component of tui.components) {
      if (component === lastSelectedComponent || "subComponentOf" in component.parent || !isInteractable(component)) {
        continue;
      }

      const { rectangle } = component;
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

    bestCandidate.state = "focused";
    lastSelectedComponent.state = "base";
    lastSelectedComponent = bestCandidate;
  });
}

export function handleMouseControls(tui: Tui): void {
  const { rid } = tui.stdout;
  Deno.writeSync(rid, textEncoder.encode(ENABLE_MOUSE));
  tui.on("destroy", () => {
    Deno.writeSync(rid, textEncoder.encode(DISABLE_MOUSE));
  });

  tui.on("mousePress", ({ x, y, drag, scroll, shift, meta, ctrl, release, button }) => {
    lastSelectedComponent ??= getComponentClosestToTopLeftCorner(tui, isInteractable);

    if (shift || meta || ctrl || button !== 0 || scroll !== 0 || drag) return;

    let bestCandidate: Component | undefined = undefined;
    for (const component of tui.components) {
      if ("subComponentOf" in component.parent || !fitsInRectangle(x, y, component.rectangle)) continue;

      if (!bestCandidate) {
        bestCandidate = component;
        continue;
      }

      if (bestCandidate.zIndex > component.zIndex) continue;

      bestCandidate = component;
    }

    if (!bestCandidate) {
      lastSelectedComponent.state = "base";
      return;
    } else if (bestCandidate !== lastSelectedComponent) {
      lastSelectedComponent.state = "base";
    }

    if (!release) {
      bestCandidate.interact("mouse");
    } else if (bestCandidate.state === "active") {
      bestCandidate.state = "base";
    }

    lastSelectedComponent = bestCandidate;
  });
}
