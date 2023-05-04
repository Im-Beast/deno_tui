// Copyright 2023 Im-Beast. All rights reserved. MIT license.

import { Tui } from "../tui.ts";
import { Component } from "../component.ts";

/** Returns whether component defines `interact` property  */
export function isInteractable(component: Component): boolean {
  return component.interact !== Component.prototype.interact;
}

/** Returns component that's the closest to top left corner of tui's canvas */
export function getComponentClosestToTopLeftCorner(tui: Tui, filterFn?: (component: Component) => boolean): Component {
  let closestDistance!: number;
  let closestComponent!: Component;

  for (const component of tui.components) {
    const rectangle = component.rectangle.peek();
    const zIndex = component.zIndex.peek();

    if (filterFn && !filterFn(component)) {
      continue;
    }

    const distance = (
      (0 - rectangle.row) ** 2 +
      (0 - rectangle.column) ** 2
    ) ** 0.5;

    if (!closestComponent || (distance < closestDistance && zIndex > closestComponent.zIndex.peek())) {
      closestDistance = distance;
      closestComponent = component;
      if (distance === 0) break;
    }
  }

  return closestComponent;
}
