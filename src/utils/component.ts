// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { Tui } from "../tui.ts";
import { Component } from "../component.ts";
import { View } from "../view.ts";

/** Returns component that's the closest to top left corner of tui's canvas */
export function getComponentClosestToTopLeftCorner(tui: Tui, filterFn?: (component: Component) => boolean): Component;
export function getComponentClosestToTopLeftCorner(view: View, filterFn?: (component: Component) => boolean): Component;
export function getComponentClosestToTopLeftCorner(
  instance: Tui | View,
  filterFn?: (component: Component) => boolean,
): Component {
  let closestToTLCorner!: [number, Component];

  for (const component of instance.components) {
    const { rectangle, zIndex } = component;
    if (!rectangle || !filterFn?.(component)) {
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
