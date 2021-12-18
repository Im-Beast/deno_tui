// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { createCanvas } from "../src/canvas.ts";
import { createTui } from "../src/tui.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  removeComponent,
} from "../src/tui_component.ts";
import { assert, assertEquals, styler } from "./deps.ts";

const canvas = createCanvas({
  filler: " ",
  writer: Deno.stdout,
  size: {
    rows: 30,
    columns: 30,
  },
});

const tui = createTui(Deno.stdin, Deno.stdout, {
  styler,
  canvas,
});

const createOptions = {
  name: "dummy",
  rectangle: {
    column: 0,
    row: 0,
    width: 0,
    height: 0,
  },
  draw() {
  },
  drawPriority: 2,
  focusedWithin: [],
  interactive: false,
  styler,
  invalidProperty: "Hello",
} as CreateComponentOptions;

const component = createComponent(tui, {
  ...createOptions,
}, {
  additional: "hello",
});

Deno.test("TuiComponent: create component", () => {
  assertEquals(Object.getOwnPropertyNames(component), [
    "id",
    "name",
    "emitter",
    "on",
    "once",
    "off",
    "instance",
    "rectangle",
    "parent",
    "children",
    "focusedWithin",
    "canvas",
    "styler",
    "drawPriority",
    "interactive",
    "draw",
    "additional",
  ]);

  assertEquals(tui.children[0], component);
  assertEquals(
    component.additional,
    "hello",
    "Component doesn't have assigned extension",
  );
  assertEquals(
    // deno-lint-ignore no-explicit-any
    (component as any).invalidProperty,
    undefined,
    "Component has improperly assigned property",
  );
});

Deno.test("TuiComponent: remove component", () => {
  assert(tui.children.includes(component), "Failed to create component");
  removeComponent(component);
  assert(
    !tui.children.includes(component),
    "Component was found in TUI's children after removing",
  );
  assertEquals(
    component.emitter.listeners.length,
    0,
    "Emitter wasn't properly cleaned after removing",
  );
});

Deno.test("TuiComponent: inherit styler from parent when missing", () => {
  const temp = createComponent(tui, {
    ...createOptions,
    styler: undefined,
  });

  assertEquals(
    temp.styler,
    styler,
    "TuiComponent doesn't properly inherit parent styler",
  );

  removeComponent(temp);
});

Deno.test("TuiComponent: get current styler", () => {
  tui.selected.item = component;
  tui.selected.focused = false;
  tui.selected.active = false;
  assertEquals(getCurrentStyler(component), styler);
  tui.selected.focused = true;
  tui.selected.active = false;
  assertEquals(getCurrentStyler(component), { ...styler, ...styler.focused });
  tui.selected.focused = true;
  tui.selected.active = true;
  assertEquals(getCurrentStyler(component), { ...styler, ...styler.active });
});
