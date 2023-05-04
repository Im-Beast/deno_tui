// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";

import { Tui } from "../src/tui.ts";
import { handleInput } from "../src/input.ts";
import { handleKeyboardControls, handleMouseControls } from "../src/controls.ts";

import { Box } from "../src/components/box.ts";
import { Text } from "../src/components/text.ts";
import { Frame } from "../src/components/frame.ts";
import { Input } from "../src/components/input.ts";
import { Label } from "../src/components/label.ts";
import { Table } from "../src/components/table.ts";
import { Button } from "../src/components/button.ts";
import { Slider } from "../src/components/slider.ts";
import { CheckBox } from "../src/components/checkbox.ts";
import { ComboBox } from "../src/components/combobox.ts";
import { ProgressBar } from "../src/components/progressbar.ts";

import { Theme } from "../src/theme.ts";
import { View } from "../src/view.ts";
import { Component } from "../mod.ts";
import { TextBox } from "../src/components/textbox.ts";
import { Computed } from "../src/signals.ts";
import { Signal } from "../src/signals.ts";

const tui = new Tui({
  style: crayon.bgBlack,
  refreshRate: 1000 / 60,
});

handleInput(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
tui.dispatch();
tui.run();

const baseTheme: Theme = {
  base: crayon.bgLightBlue,
  focused: crayon.bgCyan,
  active: crayon.bgBlue,
  disabled: crayon.bgLightBlack.black,
};

new Box({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 2,
    row: 3,
    height: 5,
    width: 10,
  },
  zIndex: 0,
});

new Button({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 15,
    row: 3,
    height: 5,
    width: 10,
  },
  zIndex: 0,
});

new CheckBox({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 28,
    row: 3,
    height: 1,
    width: 1,
  },
  checked: false,
  zIndex: 0,
});

new CheckBox({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 32,
    row: 3,
    height: 1,
    width: 1,
  },
  checked: true,
  zIndex: 0,
});

new ComboBox({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 38,
    row: 3,
    height: 1,
    width: 7,
  },
  items: ["one", "two", "three", "four"],
  placeholder: "numer",
  zIndex: 2,
});

new ComboBox({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 38,
    row: 7,
    height: 1,
    width: 7,
  },
  items: ["one", "two", "three", "four"],
  placeholder: "numer",
  zIndex: 1,
});

const progress = new Signal(0);
let progressDir = 1;
const progressBarTheme = {
  ...baseTheme,
  progress: {
    base: crayon.bgLightBlue.green,
    focused: crayon.bgCyan.lightGreen,
    active: crayon.bgBlue.lightYellow,
  },
};

new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "normal",
  theme: progressBarTheme,
  value: progress,
  min: 0,
  max: 100,
  smooth: true,
  rectangle: {
    column: 48,
    height: 2,
    row: 3,
    width: 10,
  },
  zIndex: 0,
});

new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "reversed",
  theme: progressBarTheme,
  value: progress,
  min: 0,
  max: 100,
  smooth: true,
  rectangle: {
    column: 48,
    height: 2,
    row: 7,
    width: 10,
  },
  zIndex: 0,
});

new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "normal",
  theme: progressBarTheme,
  value: progress,
  min: 0,
  max: 100,
  smooth: true,
  rectangle: {
    column: 48,
    height: 5,
    row: 11,
    width: 2,
  },
  zIndex: 0,
});

new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "reversed",
  theme: progressBarTheme,
  value: progress,
  min: 0,
  max: 100,
  smooth: true,
  rectangle: {
    column: 56,
    height: 5,
    row: 11,
    width: 2,
  },
  zIndex: 0,
});

new Label({
  parent: tui,
  align: {
    horizontal: "center",
    vertical: "center",
  },
  rectangle: {
    column: 17,
    row: 21,
    width: 20,
  },
  theme: { base: tui.style },
  text: "Centered text\nThat automatically adjusts its size\n!@#!\nSo cool\nWOW",
  zIndex: 0,
});

const sliderTheme = {
  ...baseTheme,
  thumb: {
    base: crayon.bgMagenta,
  },
};

new Slider({
  parent: tui,
  orientation: "horizontal",
  theme: sliderTheme,
  adjustThumbSize: true,
  value: 5,
  min: 1,
  max: 10,
  step: 1,
  rectangle: {
    column: 61,
    height: 2,
    row: 3,
    width: 10,
  },
  zIndex: 0,
});

new Slider({
  parent: tui,
  orientation: "vertical",
  theme: sliderTheme,
  adjustThumbSize: true,
  value: 5,
  min: 1,
  max: 10,
  step: 1,
  rectangle: {
    column: 65,
    height: 5,
    row: 7,
    width: 2,
  },
  zIndex: 0,
});

const cursorBaseTheme = {
  ...baseTheme,
  cursor: { base: crayon.invert },
};

new Input({
  parent: tui,
  placeholder: "type smth",
  theme: cursorBaseTheme,
  rectangle: {
    column: 2,
    row: 10,
    width: 14,
    height: 1,
  },
  zIndex: 0,
});

new Input({
  parent: tui,
  placeholder: "smth secret",
  theme: cursorBaseTheme,
  password: true,
  rectangle: {
    column: 2,
    row: 13,
    width: 14,
    height: 1,
  },
  zIndex: 0,
});

new TextBox({
  parent: tui,
  zIndex: 0,
  theme: {
    ...cursorBaseTheme,
    lineNumbers: {
      base: crayon.bgBlue.white,
    },
    highlightedLine: {
      base: crayon.bgLightBlue,
    },
  },
  lineNumbering: true,
  lineHighlighting: true,
  rectangle: {
    column: 2,
    row: 21,
    height: 5,
    width: 12,
  },
});

new Table({
  parent: tui,
  theme: {
    base: crayon.bgBlack.white,
    frame: { base: crayon.bgBlack },
    header: { base: crayon.bgBlack.bold.lightBlue },
    selectedRow: {
      base: crayon.bold.bgBlue.white,
      focused: crayon.bold.bgLightBlue.white,
      active: crayon.bold.bgMagenta.black,
    },
  },
  rectangle: {
    column: 20,
    height: 8,
    row: 11,
  },
  headers: [
    { title: "ID" },
    { title: "Name" },
  ],
  data: [
    ["0", "Thomas Jeronimo"],
    ["1", "Jeremy Wanker"],
    ["2", "Julianne James"],
    ["3", "Tommie Moyer"],
    ["4", "Marta Reilly"],
    ["5", "Bernardo Robertson"],
    ["6", "Hershel Grant"],
  ],
  charMap: "rounded",
  zIndex: 0,
});

const view = new View({
  rectangle: {
    column: 75,
    row: 3,
    width: 10,
    height: 10,
  },
  maxOffset: {
    columns: 0,
    rows: 20,
  },
});

const viewBackground = new Box({
  parent: tui,
  rectangle: view.rectangle,
  theme: {
    base: crayon.bgLightBlack,
  },
  zIndex: 1,
});
// @ts-ignore-
viewBackground.NOFRAME = true;

const viewScrollbar = new Slider({
  parent: tui,
  min: 0,
  max: view.maxOffset.rows,
  value: 0,
  step: 1,
  orientation: "vertical",
  adjustThumbSize: true,
  rectangle: {
    column: view.rectangle.column + view.rectangle.width - 1,
    row: view.rectangle.row,
    height: view.rectangle.height,
    width: 1,
  },
  theme: {
    thumb: { base: crayon.bgRed },
    base: crayon.bgLightBlue,
  },
  zIndex: 2,
});
// @ts-ignore-
viewScrollbar.NOFRAME = true;

viewScrollbar.value.subscribe((value) => {
  view.offset.rows = value;
});

const viewBox = new Box({
  parent: tui,
  view,
  rectangle: {
    column: 2,
    row: 1,
    width: 4,
    height: 2,
  },
  theme: {
    base: crayon.bgRed,
  },
  zIndex: 1,
});

viewBox.interact = () => {
  viewBox.state.value = "focused";
};

viewBox.on("mousePress", ({ drag, movementX, movementY }) => {
  if (!drag) return;
  const rectangle = viewBox.rectangle.value;
  rectangle.column += movementX;
  rectangle.row += movementY;
});

const moveButton = new Button({
  parent: tui,
  rectangle: {
    column: 2,
    row: 16,
    width: 6,
    height: 2,
  },
  label: { text: "move\nme" },
  theme: {
    base: crayon.bgGreen,
    focused: crayon.bgLightGreen,
    active: crayon.bgMagenta,
  },
  zIndex: 2,
});

moveButton.on("mousePress", (event) => {
  if (!event.drag) return;
  const rectangle = moveButton.rectangle.value;
  rectangle.column += event.movementX;
  rectangle.row += event.movementY;
});

new Text({
  parent: tui,
  view,
  rectangle: {
    column: 2,
    row: 13,
  },
  theme: baseTheme,
  text: "wopa",
  zIndex: 2,
});

// Generate frames and labels for every component
tui.canvas.on("render", () => {
  const components: Component[] = [];
  const tuiStyleTheme = { base: tui.style };

  for (const component of tui.components) {
    if (
      // @ts-expect-error NOFRAME
      component.view.peek() || component.parent !== tui || component.NOFRAME ||
      component === performanceStats
    ) {
      continue;
    }

    components.push(
      new Frame({
        parent: tui,
        rectangle: component.rectangle,
        visible: false,
        charMap: "rounded",
        theme: tuiStyleTheme,
        zIndex: component.zIndex,
      }),
    );
  }

  tui.on("keyPress", ({ ctrl, meta, shift, key }) => {
    if (!ctrl || key !== "f" || meta || shift) return;
    for (const component of components) {
      component.visible.value = !component.visible.value;
    }
  });
}, true);

const fps = new Signal(60);
let lastRender = 0;

const performanceStats = new Text({
  parent: tui,
  rectangle: { column: 0, row: 0 },
  theme: baseTheme,
  text: new Computed(() =>
    `\
FPS: ${fps.value.toFixed(2)}\
 | Components: ${tui.components.size}\
 | Drawn objects: ${tui.canvas.drawnObjects.length}\
 | Press CTRL+F to toggle Frame/Label visibility`
  ),
  zIndex: 0,
});

tui.canvas.on("render", () => {
  fps.value = 1000 / (performance.now() - lastRender);
  lastRender = performance.now();

  progress.value += progressDir;
  if (progress.peek() >= 100 || progress.peek() <= 0) progressDir *= -1;
});
