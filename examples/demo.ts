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

import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";
import { Theme } from "../src/theme.ts";
import { View } from "../src/view.ts";
import { clamp, Component, isInteractable } from "../mod.ts";

const tui = new Tui({
  style: crayon.bgBlack,
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

const performanceStats = new Text({
  parent: tui,
  rectangle: { column: 0, row: 0 },
  theme: baseTheme,
  value: "",
});

new Box({
  parent: tui,
  theme: baseTheme,
  rectangle: {
    column: 2,
    row: 3,
    height: 5,
    width: 10,
  },
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
  value: false,
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
  label: {
    value: "numer",
  },
  zIndex: 1,
});

const progressBar1 = new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "normal",
  theme: {
    ...baseTheme,
    progress: {
      base: crayon.bgLightBlue.green,
      focused: crayon.bgCyan.lightGreen,
      active: crayon.bgBlue.lightYellow,
    },
  },
  value: 50,
  min: 0,
  max: 100,
  smooth: true,
  rectangle: {
    column: 48,
    height: 2,
    row: 3,
    width: 10,
  },
});

new Label({
  parent: tui,
  align: {
    horizontal: "center",
    vertical: "center",
  },
  rectangle: {
    column: 75,
    row: 3,
  },
  theme: { base: tui.style },
  value: "Centered text\nThat automatically adjusts its rectangle size\n!@#!\nSo cool\nWOW",
});

const progressBar2 = new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "normal",
  theme: {
    ...baseTheme,
    progress: {
      base: crayon.bgLightBlue.green,
      focused: crayon.bgCyan.lightGreen,
      active: crayon.bgBlue.lightYellow,
    },
  },
  value: 75,
  min: 0,
  max: 100,
  smooth: true,
  rectangle: {
    column: 48,
    height: 5,
    row: 10,
    width: 2,
  },
});

new Slider({
  parent: tui,
  orientation: "horizontal",
  theme: {
    ...baseTheme,
    thumb: {
      base: crayon.bgMagenta,
    },
  },
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
});

new Slider({
  parent: tui,
  orientation: "vertical",
  theme: {
    ...baseTheme,
    thumb: {
      base: crayon.bgMagenta,
    },
  },
  value: 5,
  min: 1,
  max: 10,
  step: 1,
  rectangle: {
    column: 61,
    height: 5,
    row: 10,
    width: 2,
  },
});

new Input({
  parent: tui,
  placeholder: "type smth",
  theme: {
    ...baseTheme,
    cursor: {
      base: crayon.invert,
    },
    value: {
      base: crayon.bgBlue.white,
    },
    placeholder: {
      base: crayon.bgLightBlue.lightBlack,
      focused: crayon.bgCyan.lightBlack,
      active: crayon.bgBlue.lightBlack,
    },
  },
  rectangle: {
    column: 2,
    row: 11,
    width: 10,
    height: 1,
  },
});

/* new TextboxComponent({
  tui,
  theme: baseTheme,
  multiline: false,
  rectangle: {
    column: 2,
    row: 11,
    height: 1,
    width: 10,
  },
  value: "hi",
});

new TextboxComponent({
  tui,
  theme: {
    ...baseTheme,
    placeholder: crayon.lightBlack,
  },
  multiline: false,
  rectangle: {
    column: 2,
    row: 15,
    height: 1,
    width: 10,
  },
  placeholder: "example",
});

new TextboxComponent({
  tui,
  theme: baseTheme,
  multiline: false,
  hidden: true,
  rectangle: {
    column: 15,
    row: 11,
    height: 1,
    width: 10,
  },
  value: "hi!",
});

new TextboxComponent({
  tui,
  theme: {
    ...baseTheme,
    lineNumbers: {
      base: crayon.bgBlue.white,
    },
    highlightedLine: {
      base: crayon.bgLightBlue,
    },
  },
  multiline: true,
  lineNumbering: true,
  lineHighlighting: true,
  hidden: false,
  rectangle: {
    column: 29,
    row: 11,
    height: 5,
    width: 12,
  },
  value: "hello!\nwhats up?",
}); */

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
    column: 75,
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
});

const view = new View({
  rectangle: {
    column: 125,
    row: 1,
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
  rectangle: {
    column: view.rectangle.column,
    row: view.rectangle.row,
    width: view.rectangle.width,
    height: view.rectangle.height,
  },
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

viewScrollbar.on("mouseScroll", ({ scroll }) => {
  viewScrollbar.value = clamp(viewScrollbar.value + scroll * viewScrollbar.step, viewScrollbar.min, viewScrollbar.max);
  viewScrollbar.emit("valueChange", viewScrollbar);
});

viewScrollbar.on("valueChange", () => {
  view.offset.rows = viewScrollbar.value;
  viewBackground.rectangle.row = view.rectangle.row;
  viewScrollbar.rectangle.row = view.rectangle.row;
});

const box = new Box({
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
  zIndex: 2,
});

box.interact = () => {
  box.state = "focused";
};

box.on("mousePress", ({ drag, movementX, movementY }) => {
  if (!drag) return;
  box.rectangle.column += movementX;
  box.rectangle.row += movementY;
});

new Button({
  parent: tui,
  view,
  rectangle: {
    column: 2,
    row: 9,
    width: 4,
    height: 2,
  },
  theme: {
    base: crayon.bgGreen,
    focused: crayon.bgLightGreen,
    active: crayon.bgMagenta,
  },
  zIndex: 2,
});

new Text({
  parent: tui,
  view,
  rectangle: {
    column: 2,
    row: 13,
  },
  theme: baseTheme,
  value: "wopa",
  zIndex: 2,
});

// Generate frames and labels for every component
queueMicrotask(() => {
  const components: Component[] = [];

  for (const component of tui.components) {
    // @ts-ignore-
    if (component.view || component.NOFRAME || component === performanceStats) continue;

    const name = component.constructor.name;

    const { column, row } = component.rectangle;
    components.push(
      new Text({
        parent: tui,
        theme: { base: tui.style },
        rectangle: {
          column: column - 1,
          row: row - 2,
        },
        value: name,
        zIndex: component.zIndex,
      }),
      new Frame({
        parent: tui,
        component,
        charMap: "rounded",
        theme: { base: tui.style },
        zIndex: component.zIndex,
      }),
    );
  }

  tui.on("keyPress", ({ ctrl, meta, shift, key }) => {
    if (!ctrl || key !== "f" || meta || shift) return;
    for (const component of components) {
      component.visible = !component.visible;
    }
  });
});

let fps = 60;
let lastRender = 0;
let progressBarDir = 1;
tui.canvas.on("render", () => {
  fps = 1000 / (performance.now() - lastRender);
  lastRender = performance.now();

  progressBar1.value = progressBar2.value += progressBarDir;
  if (progressBar1.value >= progressBar1.max || progressBar1.value <= progressBar1.min) {
    progressBarDir *= -1;
  }

  performanceStats.value = `\
FPS: ${fps.toFixed(2)}\
 | Components: ${tui.components.length}\
 | Drawn objects: ${tui.canvas.drawnObjects.length}\
 | Press CTRL+F to toggle Frame/Label visibility`;
});
