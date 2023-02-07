import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";
import { Box } from "../src/components/box.ts";
import { Button } from "../src/components/button.ts";
import { Text } from "../src/components/text.ts";
import { handleKeyboardControls, handleMouseControls } from "../src/controls.ts";
import { handleInput } from "../src/input.ts";
import { Tui } from "../src/tui.ts";

const tui = new Tui({
  style: crayon.bgBlack,
});

handleInput(tui);
handleKeyboardControls(tui);
handleMouseControls(tui);
tui.dispatch();
tui.run();

const box = new Box({
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
  forceDynamicRendering: true,
});

const button2 = new Button({
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
  forceDynamicRendering: true,
});

const button3 = new Button({
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
  forceDynamicRendering: true,
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
  forceDynamicRendering: true,
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
  forceDynamicRendering: true,
  zIndex: 0,
});

tui.on("mousePress", (mousePress) => {
  if (!mousePress.drag) return;

  button.rectangle.column = mousePress.x;
  button.rectangle.row = mousePress.y;
});

tui.canvas.on("render", () => {
  fpsCounter.value = `${tui.canvas.fps.toFixed(2)} FPS`;
  text.value = `hello ${(Math.random() * 100).toFixed(5)}`;
});

tui.addChildren(box, button, button2, button3, text, fpsCounter);
