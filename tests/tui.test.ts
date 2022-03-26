// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createCanvas,
  createComponent,
  createTui,
  draw,
  getCurrentStyler,
  getInteractiveComponents,
  removeComponent,
  setDebugMode,
} from "../mod.ts";
import { assert, assertEquals, encodeBuffer } from "./deps.ts";

Deno.test("Tui", async (t) => {
  // https://github.com/denoland/deno/issues/13265
  Deno.addSignalListener = () => {};

  setDebugMode(true);

  const tui = createTui({
    styler: {
      foreground: "\x1b[32m",
      background: "\x1b[43m",
    },
    reader: Deno.stdin,
    writer: Deno.stdout,
    canvas: createCanvas({
      filler: " ",
      writer: Deno.stdout,
      size: {
        rows: 30,
        columns: 30,
      },
    }),
  });

  const emptyFrameBuffer = encodeBuffer(tui.canvas.frameBuffer);

  await t.step("Creating Component", () => {
    const component = createComponent(tui, {
      name: "dummy",
      interactive: false,
    });

    assertEquals(tui.children.length, 1);
    assertEquals(tui.components.length, 1);
    assertEquals(tui.components[0], component);
    assertEquals(tui.children[0], component);

    assertEquals(Object.getOwnPropertyNames(component), [
      "id",
      "parent",
      "tui",
      "children",
      "focusedWithin",
      "canvas",
      "styler",
      "rectangle",
      "emitter",
      "on",
      "once",
      "off",
      "emit",
      "name",
      "interactive",
    ]);

    draw(tui);

    assertEquals(encodeBuffer(tui.canvas.frameBuffer), emptyFrameBuffer);

    const extendedComponent = createComponent(tui, {
      name: "extendedDummy",
      interactive: false,
    }, {
      added: "Hello!",
    });

    assertEquals(tui.children.length, 2);
    assertEquals(tui.components.length, 2);
    assertEquals(tui.components[1], extendedComponent);
    assertEquals(tui.children[1], extendedComponent);

    assertEquals(Object.getOwnPropertyNames(extendedComponent), [
      "id",
      "parent",
      "tui",
      "children",
      "focusedWithin",
      "canvas",
      "styler",
      "rectangle",
      "emitter",
      "on",
      "once",
      "off",
      "emit",
      "added", // <-- extension
      "name",
      "interactive",
    ]);

    const childComponent = createComponent(extendedComponent, {
      name: "dummy",
      interactive: false,
    });

    assertEquals(tui.children.length, 2);
    assertEquals(tui.components.length, 3);
    assertEquals(extendedComponent.children[0], childComponent);
  });

  await t.step("Remove component", () => {
    const component = tui.children[0];
    removeComponent(component);

    assert(
      !tui.components.includes(component),
      "Component found in `components` after removing",
    );

    assert(
      !tui.children.includes(component),
      "Component found in `children` after removing",
    );

    assertEquals(
      component.emitter.listeners.length,
      0,
      "Emitter wasn't properly cleaned after removing",
    );
  });

  await t.step("Inherit styler from parent when not specified", () => {
    const temporary = createComponent(tui, {
      name: "dummy",
      interactive: false,
    });

    assertEquals(
      temporary.styler,
      tui.styler,
      "Component didn't properly inherit styler from parent",
    );

    removeComponent(temporary);
  });

  await t.step("Get current styler", () => {
    const component = tui.children[0];
    const styler = component.styler;

    assertEquals(getCurrentStyler(component), styler);

    tui.focused.item = component;
    tui.focused.active = false;
    assertEquals(getCurrentStyler(component), { ...styler, ...styler.focused });

    tui.focused.active = true;
    assertEquals(getCurrentStyler(component), {
      ...styler,
      ...styler.focused,
      ...styler.active,
    });
  });

  await t.step("Get interactive components", () => {
    const before = getInteractiveComponents(tui);
    assertEquals(before, []);

    const interactiveComponent = createComponent(tui, {
      name: "interactiveBuddy",
      interactive: true,
    });

    const after = getInteractiveComponents(tui);
    assertEquals(after, [interactiveComponent]);
  });
});
