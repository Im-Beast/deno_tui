// Copyright 2022 Im-Beast. All rights reserved. MIT license.
// Demo showcasing every component

import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";

import { Tui } from "../src/tui.ts";
import { Canvas } from "../src/canvas.ts";

import { Box } from "../src/components/box.ts";
import { Button } from "../src/components/button.ts";
import { Checkbox } from "../src/components/checkbox.ts";
import { Combobox } from "../src/components/combobox.ts";
import { Frame } from "../src/components/frame.ts";
import { ProgressBar } from "../src/components/progress_bar.ts";
import { Slider } from "../src/components/slider.ts";
// import { Textbox } from "../src/components/textbox.ts";
import { Theme } from "../src/theme.ts";
import { Label } from "../src/components/label.ts";
// import { Table } from "../src/components/table.ts";
import { View } from "../src/view.ts";
import { handleControls } from "../src/controls.ts";
import { handleInput } from "../src/input.ts";

const baseTheme: Theme = {
  base: crayon.bgLightBlue,
  focused: crayon.bgCyan,
  active: crayon.bgBlue,
  disabled: crayon.bgLightBlack,
};

const tuiStyle = crayon.bgBlack.white;
const tui = new Tui({
  style: tuiStyle,
  canvas: new Canvas({
    refreshRate: 1000 / 60,
    stdout: Deno.stdout,
  }),
});

tui.dispatch();
handleInput(tui);
handleControls(tui);

new Box({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 2,
    row: 3,
    height: 5,
    width: 10,
  },
});

new Button({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 15,
    row: 3,
    height: 5,
    width: 10,
  },
});

new Checkbox({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 28,
    row: 3,
    height: 1,
    width: 1,
  },
});

new Combobox({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 38,
    row: 3,
    height: 1,
    width: 7,
  },
  options: ["one", "two", "three", "four"],
  zIndex: 2,
});

new Combobox({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 38,
    row: 7,
    height: 1,
    width: 7,
  },
  options: ["one", "two", "three", "four"],
  label: "numer",
  zIndex: 1,
});

const progressBar1 = new ProgressBar({
  tui,
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
  direction: "horizontal",
  smooth: true,
  rectangle: {
    column: 48,
    height: 2,
    row: 3,
    width: 10,
  },
});

new Label({
  tui,
  align: {
    horizontal: "center",
    vertical: "center",
  },
  rectangle: {
    column: 75,
    row: 3,
    // Automatically adjust size
    height: -1,
    width: -1,
  },
  theme: { base: tuiStyle },
  value: "Centered text\nThat automatically adjusts its rectangle size\n!@#!\nSo cool\nWOW",
});

const progressBar2 = new ProgressBar({
  tui,
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
  direction: "vertical",
  smooth: true,
  rectangle: {
    column: 48,
    height: 5,
    row: 10,
    width: 2,
  },
});

new Slider({
  tui,
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
  direction: "horizontal",
  rectangle: {
    column: 61,
    height: 2,
    row: 3,
    width: 10,
  },
});

new Slider({
  tui,
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
  direction: "vertical",
  rectangle: {
    column: 61,
    height: 5,
    row: 10,
    width: 2,
  },
});

/* new Textbox({
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

new Textbox({
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

new Textbox({
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

new Textbox({
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
});

new Table({
  tui,
  theme: {
    base: crayon.bgBlack.white,
    frame: { focused: crayon.bgBlack.bold },
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
  headers: ["ID", "Name"],
  data: [
    ["0", "Thomas Jeronimo"],
    ["1", "Jeremy Wanker"],
    ["2", "Julianne James"],
    ["3", "Tommie Moyer"],
    ["4", "Marta Reilly"],
    ["5", "Bernardo Robertson"],
    ["6", "Hershel Grant"],
  ],
  framePieces: "rounded",
}); */

const testView = new View({
  tui,
  title: "Test view",
  rectangle: {
    column: 125,
    row: 3,
    height: 15,
    width: 30,
  },
  theme: {
    sliders: {
      base: crayon.bgRed,
    },
  },
  scrollable: true,
});

new Button({
  tui,
  rectangle: {
    column: 0,
    row: 1,
    height: 2,
    width: 4,
  },
  theme: {
    base: crayon.bgRed,
    focused: crayon.bgBlue,
    active: crayon.bgMagenta,
  },
  view: testView,
  zIndex: 2,
});

new Button({
  tui,
  rectangle: {
    column: 50,
    row: 1,
    height: 2,
    width: 4,
  },
  theme: {
    base: crayon.bgRed,
    focused: crayon.bgBlue,
    active: crayon.bgMagenta,
  },
  view: testView,
  zIndex: 2,
});

// Generate frames and labels for every component
queueMicrotask(() => {
  for (const component of tui.components) {
    const { rectangle, view } = component;
    if (!rectangle) continue;

    const name = component.constructor.name.replace("Component", "");
    const theme = {
      base: tuiStyle,
    };

    new Label({
      tui,
      view,
      theme,
      align: {
        horizontal: "left",
        vertical: "top",
      },
      rectangle: {
        column: rectangle.column - 1,
        row: rectangle.row - 2,
        height: -1,
        width: -1,
      },
      value: name,
    });

    new Frame({
      tui,
      view,
      component,
      framePieces: "rounded",
      theme: {
        base: tuiStyle,
        focused: tuiStyle.bold,
      },
    });
  }
});

let direction = 1;
let avgFps = 60;

tui.run();

tui.canvas.drawText({
  rectangle: {
    column: 0,
    row: 0,
  },
  get value() {
    avgFps = ((avgFps * 99) + tui.canvas.fps) / 100;
    return `${avgFps.toFixed(2)} FPS`;
  },
  style: baseTheme.base,
  dynamic: true,
  zIndex: 1,
});

tui.on("update", () => {
  if (progressBar1.value === progressBar1.max || progressBar1.value === progressBar1.min) {
    direction *= -1;
  }

  progressBar1.value += direction;
  progressBar2.value += direction;
});
