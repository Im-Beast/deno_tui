// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { Tui } from "../tui.ts";
import { Component } from "../component.ts";

/** Returns component that's the closest to top left corner of tui's canvas */
export function getComponentClosestToTopLeftCorner(tui: Tui, interactable = false): Component {
  let closestToTLCorner!: [number, Component];
  for (const component of tui.components) {
    const { rectangle, zIndex, interact } = component;
    if (!rectangle || (interactable && interact === Component.prototype.interact)) {
      continue;
    }

    const distance = (
      (0 - rectangle.row) ** 2 +
      (0 - rectangle.column) ** 2
    ) ** 0.5;

    if (!closestToTLCorner || (distance < closestToTLCorner[0] && zIndex > closestToTLCorner[1].zIndex)) {
      closestToTLCorner = [distance, component];
    }
  }
  return closestToTLCorner[1];
}
