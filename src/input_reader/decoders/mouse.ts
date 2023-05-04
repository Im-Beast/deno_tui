// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import type { MouseEvent, MousePressEvent, MouseScrollEvent } from "../types.ts";

const a: MouseEvent = {
  key: "mouse",
  x: 0,
  y: 0,
  movementX: 0,
  movementY: 0,
  buffer: new Uint8Array(0),
  shift: false,
  ctrl: false,
  meta: false,
};
const b = structuredClone(a);

let mouseEvent: MouseEvent = a;
let lastMouseEvent: MouseEvent = b;

/**
 * Decode SGR mouse mode code sequence to {MousePress} object.
 * If it can't convert specified {code} to {MousePress} it returns undefined.
 */
export function decodeMouseSGR(
  buffer: Uint8Array,
  code: string,
): MousePressEvent | MouseScrollEvent | undefined {
  const action = code.at(-1);
  if (!code.startsWith("\x1b[<") || (action !== "m" && action !== "M")) {
    return undefined;
  }

  const release = action === "m";

  const xSeparator = code.indexOf(";");
  let modifiers = +code.slice(3, xSeparator);
  const ySeparator = code.indexOf(";", xSeparator + 1);
  let x = +code.slice(xSeparator + 1, ySeparator);
  let y = +code.slice(ySeparator + 1, code.length - 1);

  x -= 1;
  y -= 1;

  const movementX = lastMouseEvent ? x - lastMouseEvent.x : 0;
  const movementY = lastMouseEvent ? y - lastMouseEvent.y : 0;

  let scroll: MouseScrollEvent["scroll"] = 0;
  if (modifiers >= 64) {
    scroll = modifiers % 2 === 0 ? -1 : 1;
    modifiers -= scroll < 0 ? 64 : 65;
  }

  let drag = false;
  if (modifiers >= 32) {
    drag = true;
    modifiers -= 32;
  }

  let ctrl = false;
  if (modifiers >= 16) {
    ctrl = true;
    modifiers -= 16;
  }

  let meta = false;
  if (modifiers >= 8) {
    meta = true;
    modifiers -= 8;
  }

  let shift = false;
  if (modifiers >= 4) {
    shift = true;
    modifiers -= 4;
  }

  let button: MousePressEvent["button"];
  if (!scroll) {
    button = modifiers as MousePressEvent["button"];
  }

  lastMouseEvent = mouseEvent;
  const previous = lastMouseEvent;
  mouseEvent = previous;

  // Clear data from previous events
  const allMouseEvents = mouseEvent as Partial<MousePressEvent & MouseScrollEvent>;
  delete allMouseEvents.scroll;
  delete allMouseEvents.drag;
  delete allMouseEvents.button;
  delete allMouseEvents.release;

  mouseEvent.buffer = buffer;
  mouseEvent.x = x;
  mouseEvent.y = y;
  mouseEvent.ctrl = ctrl;
  mouseEvent.meta = meta;
  mouseEvent.shift = shift;
  mouseEvent.movementX = movementX;
  mouseEvent.movementY = movementY;

  if (scroll) {
    const mouseScrollEvent = mouseEvent as MouseScrollEvent;
    mouseScrollEvent.scroll = scroll;
    return mouseScrollEvent;
  } else {
    const mousePressEvent = mouseEvent as MousePressEvent;
    mousePressEvent.drag = drag;
    mousePressEvent.button = button!;
    mousePressEvent.release = release;
    return mousePressEvent;
  }
}

/**
 * Decode VT and UTF8 mouse mode code sequence to {MousePress} object.
 * If it can't convert specified {code} to {MousePress} it returns undefined.
 */
export function decodeMouseVT_UTF8(
  buffer: Uint8Array,
  code: string,
): MousePressEvent | MouseScrollEvent | undefined {
  if (!code.startsWith("\x1b[M")) return undefined;

  const modifiers = code.charCodeAt(3);
  let x = code.charCodeAt(4);
  let y = code.charCodeAt(5);

  x -= 0o41;
  y -= 0o41;

  const movementX = lastMouseEvent ? x - lastMouseEvent.x : 0;
  const movementY = lastMouseEvent ? y - lastMouseEvent.y : 0;

  const buttonInfo = modifiers & 3;
  let release = false;

  let button: MousePressEvent["button"];
  if (buttonInfo === 3) {
    release = true;
  } else {
    button = buttonInfo as MousePressEvent["button"];
  }

  const shift = !!(modifiers & 4);
  const meta = !!(modifiers & 8);
  const ctrl = !!(modifiers & 16);
  const scroll = button && !!(modifiers & 32) && !!(modifiers & 64) ? (modifiers & 3 ? 1 : -1) : 0;
  if (scroll) button = undefined;
  const drag = !scroll && !!(modifiers & 64);

  lastMouseEvent = mouseEvent;
  const previous = lastMouseEvent;
  mouseEvent = previous;

  // Clear data from previous events
  const allMouseEvents = mouseEvent as Partial<MousePressEvent & MouseScrollEvent>;
  delete allMouseEvents.scroll;
  delete allMouseEvents.drag;
  delete allMouseEvents.button;
  delete allMouseEvents.release;

  mouseEvent.buffer = buffer;
  mouseEvent.x = x;
  mouseEvent.y = y;
  mouseEvent.ctrl = ctrl;
  mouseEvent.meta = meta;
  mouseEvent.shift = shift;
  mouseEvent.movementX = movementX;
  mouseEvent.movementY = movementY;

  if (scroll) {
    const mouseScrollEvent = mouseEvent as MouseScrollEvent;
    mouseScrollEvent.scroll = scroll;
    return mouseScrollEvent;
  } else {
    const mousePressEvent = mouseEvent as MousePressEvent;
    mousePressEvent.drag = drag;
    mousePressEvent.button = button!;
    mousePressEvent.release = release;
    return mousePressEvent;
  }
}
