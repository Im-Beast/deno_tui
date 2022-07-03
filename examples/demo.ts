import { Canvas } from "../src/canvas.ts";
import { BoxComponent } from "../src/components/box.ts";
import { ButtonComponent } from "../src/components/button.ts";
import { crayon } from "../src/deps.ts";
import { Tui } from "../src/tui.ts";

const tui = new Tui({
  theme: {
    active: crayon,
    base: crayon.bgBlue,
    focused: crayon,
  },
  canvas: new Canvas({
    refreshRate: 1000 / 60,
    size: await Deno.consoleSize(Deno.stdout.rid),
    stdout: Deno.stdout,
  }),
});

const { columns: width, rows: height } = tui.canvas.size;
const background = new BoxComponent({
  tui,
  rectangle: {
    column: 0,
    row: 0,
    width,
    height,
  },
  theme: {
    base: crayon.bgBlue,
  },
});

tui.canvas.addEventListener("resize", ({ detail }) => {
  const { columns, rows } = detail.size;
  background.rectangle.width = columns;
  background.rectangle.height = rows;
});

new BoxComponent({
  tui,
  rectangle: {
    column: 1,
    row: 1,
    height: 5,
    width: 10,
  },
  theme: {
    base: (text: string) =>
      crayon.bgRgb(
        Math.random() * 255,
        Math.random() * 255,
        Math.random() * 255,
      )(text),
  },
});

new BoxComponent({
  tui,
  rectangle: {
    column: 1,
    row: 7,
    height: 5,
    width: 10,
  },
  theme: {
    base: (text: string) =>
      crayon.bgRgb(
        Math.random() * 255,
        Math.random() * 255,
        Math.random() * 255,
      )(text),
  },
});

const button = new ButtonComponent({
  tui,
  rectangle: {
    column: 15,
    row: 2,
    height: 9,
    width: 11,
  },
  theme: {
    base: crayon.bgCyan,
  },
});

button.label = "Hello";

for await (const timing of tui.run()) {
}
