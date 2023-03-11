import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";
import { Box } from "../src/components/box.ts";
import { Button } from "../src/components/button.ts";
import { Text } from "../src/components/text.ts";
import { Label } from "../src/components/label.ts";
import { handleKeyboardControls, handleMouseControls } from "../src/controls.ts";
import { handleInput } from "../src/input.ts";
import { Tui } from "../src/tui.ts";
import { CheckBox } from "../src/components/checkbox.ts";
import { ComboBox } from "../src/components/combobox.ts";
import { ProgressBar } from "../src/components/progressbar.ts";

const tui = new Tui({
  style: crayon.bgBlack,
});

handleInput(tui);
handleKeyboardControls(tui);
handleMouseControls(tui);
tui.dispatch();
tui.run();

new Box({
  parent: tui,
  rectangle: {
    column: 2,
    row: 1,
    width: 10,
    height: 5,
  },
  theme: {
    base: crayon.bgRed,
    focused: crayon.bgLightRed,
    active: crayon.bgYellow,
    disabled: crayon.bgLightBlack,
  },
  zIndex: 1,
});

const button = new Button({
  parent: tui,
  rectangle: {
    column: 50,
    row: 5,
    width: 10,
    height: 5,
  },
  theme: {
    base: crayon.bgRed,
    focused: crayon.bgLightRed,
    active: crayon.bgYellow,
    disabled: crayon.bgLightBlack,
  },
  label: {
    value: "hello\nworld\nthis is\nbutton\ntoo long line",
  },
  zIndex: 11,
});

new Button({
  parent: tui,
  rectangle: {
    column: 62,
    row: 5,
    width: 10,
    height: 5,
  },
  theme: {
    base: crayon.bgBlue,
    focused: crayon.bgLightBlue,
    active: crayon.bgCyan,
    disabled: crayon.bgLightBlack,
  },
  label: {
    value: "to the\nbottom\nright",
    align: {
      horizontal: "right",
      vertical: "bottom",
    },
  },
  zIndex: 2,
});

new Button({
  parent: tui,
  rectangle: {
    column: 62,
    row: 11,
    width: 10,
    height: 5,
  },
  theme: {
    base: crayon.bgGreen,
    focused: crayon.bgLightGreen,
    active: crayon.bgLightYellow,
    disabled: crayon.bgLightBlack,
  },
  label: {
    value: "to the\ncenter\nleft",
    align: {
      vertical: "center",
      horizontal: "left",
    },
  },
  zIndex: 3,
});

const fpsCounter = new Text({
  parent: tui,
  rectangle: {
    column: 0,
    row: 0,
  },
  theme: {
    base: crayon.bgBlack.green,
    focused: crayon.bgBlack.green,
    active: crayon.bgBlack.green,
    disabled: crayon.bgBlack.green,
  },
  value: "0 FPS",
  zIndex: 0,
});

const text = new Text({
  parent: tui,
  rectangle: {
    column: 2,
    row: 9,
  },
  theme: {
    base: crayon.bgBlack.red,
    focused: crayon.bgBlack.lightRed,
    active: crayon.bgBlack.yellow,
    disabled: crayon.bgBlack.lightBlack,
  },
  value: "hello",
  zIndex: 0,
});

const label = new Label({
  parent: tui,
  rectangle: {
    column: 20,
    row: 5,
  },
  theme: {
    base: crayon.bgBlack.lightBlue,
    focused: crayon.bgBlack.yellow,
    active: crayon.lightYellow,
    disabled: crayon.bgLightBlack,
  },
  value: `hello\nworld!\nhow are you?\n`,
});

new CheckBox({
  parent: tui,
  value: false,
  rectangle: {
    column: 20,
    row: 1,
    width: 1,
    height: 1,
  },
  theme: {
    base: crayon.bgMagenta.white,
    focused: crayon.bgBlue.white,
    active: crayon.bgGreen.white,
    disabled: crayon.bgLightBlack.white,
  },
});

new ComboBox({
  parent: tui,
  items: ["uno", "dos", "tres", "quatro", "cinque", "otto"],
  rectangle: {
    column: 35,
    row: 1,
    height: 1,
    width: 10,
  },
  theme: {
    base: crayon.bgMagenta.white,
    focused: crayon.bgBlue.white,
    active: crayon.bgGreen.white,
    disabled: crayon.bgLightBlack.white,
  },
  zIndex: 5,
});

const progressBar1 = new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "normal",
  rectangle: {
    column: 74,
    row: 1,
    height: 2,
    width: 10,
  },
  smooth: false,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgGreen.yellow,
    },
  },
});

const progressBar2 = new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "reversed",
  rectangle: {
    column: 74,
    row: 4,
    height: 2,
    width: 10,
  },
  smooth: false,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgGreen.yellow,
    },
  },
});

const progressBar3 = new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "normal",
  rectangle: {
    column: 74,
    row: 7,
    height: 2,
    width: 10,
  },
  smooth: true,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgYellow.green,
    },
  },
});

const progressBar4 = new ProgressBar({
  parent: tui,
  orientation: "horizontal",
  direction: "reversed",
  rectangle: {
    column: 74,
    row: 10,
    height: 2,
    width: 10,
  },
  smooth: true,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgYellow.green,
    },
  },
});

const progressBar5 = new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "normal",
  rectangle: {
    column: 86,
    row: 1,
    height: 8,
    width: 3,
  },
  smooth: false,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgGreen.yellow,
    },
  },
});

const progressBar6 = new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "reversed",
  rectangle: {
    column: 91,
    row: 1,
    height: 8,
    width: 3,
  },
  smooth: false,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgGreen.yellow,
    },
  },
});

const progressBar7 = new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "normal",
  rectangle: {
    column: 96,
    row: 1,
    height: 8,
    width: 3,
  },
  smooth: true,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgYellow.green,
    },
  },
});

const progressBar8 = new ProgressBar({
  parent: tui,
  orientation: "vertical",
  direction: "reversed",
  rectangle: {
    column: 101,
    row: 1,
    height: 8,
    width: 3,
  },
  smooth: true,
  min: 0,
  max: 1,
  value: 0.5,
  theme: {
    base: crayon.bgYellow.green,
    progress: {
      base: crayon.bgYellow.green,
    },
  },
});

tui.on("mousePress", (mousePress) => {
  if (!mousePress.drag || button.state === "base") return;

  button.rectangle.column = mousePress.x;
  button.rectangle.row = mousePress.y;
});

tui.canvas.on("render", () => {
  fpsCounter.value = `${tui.canvas.fps.toFixed(2)} FPS`;
  text.value = `hello ${(Math.random() * 100).toFixed(5)}`;
});

let i = 0;
let dir = 0.025;

setInterval(() => {
  label.value = `hello\nworld!\nhow are you?\n${`${i % 10} lines\n`.repeat(i++ % 10)}`;
  text.rectangle.column++;

  progressBar8.value += dir;

  progressBar1.value =
    progressBar2.value =
    progressBar3.value =
    progressBar4.value =
    progressBar5.value =
    progressBar6.value =
    progressBar7.value =
      progressBar8.value;

  if (progressBar1.value >= 1 || progressBar1.value <= 0) dir *= -1;
}, 80);
