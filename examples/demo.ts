import { Canvas } from "../src/canvas.ts";
import { BoxComponent } from "../src/components/box.ts";
import { ButtonComponent } from "../src/components/button.ts";
import { crayon } from "../src/deps.ts";
import { handleKeypresses } from "../src/key_reader.ts";
import { handleMouseControls } from "../src/mouse.ts";
import { Tui } from "../src/tui.ts";
import { Timing } from "../src/util.ts";

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
    base: crayon.bgRgb(44, 44, 44),
  },
});
background.interact = () => {};

tui.canvas.addEventListener("resize", ({ detail: size }) => {
  const { columns, rows } = size;
  background.rectangle.width = columns;
  background.rectangle.height = rows;
});

new ButtonComponent({
  tui,
  rectangle: {
    column: 15,
    row: 2,
    height: 9,
    width: 11,
  },
  theme: {
    base: crayon.bgCyan.bold.rgb(255, 0, 0),
    focused: crayon.bgLightBlue,
    active: crayon.bgRed,
  },
  label: "Hello",
});

const bouncyBox = new ButtonComponent({
  tui,
  rectangle: {
    column: 0,
    row: 0,
    height: 5,
    width: 10,
  },
  theme: {
    base: crayon.bgYellow,
  },
});

let h = 0;
const fpsMeter = new ButtonComponent({
  tui,
  rectangle: {
    column: 0,
    row: 0,
    height: 1,
    width: 25,
  },
  theme: {
    base: (text: string) =>
      crayon.black.bgHsl((h += 0.25) % 360, 50, 50).bold(
        text,
      ),
  },
  label: "-",
});

handleKeypresses(tui);
handleMouseControls(tui);

let x = 1;
let y = 1;

let avgFps = 1000 / tui.canvas.refreshRate;
for await (const event of tui.run()) {
  avgFps = (avgFps * 99 + tui.canvas.fps) / 100;
  fpsMeter.label = `cur:${tui.canvas.fps.toFixed(2)} / avg:${
    avgFps.toFixed(2)
  }`;

  if (event.type === "update") {
    bouncyBox.rectangle.column += x;
    bouncyBox.rectangle.row += y;

    if (
      bouncyBox.rectangle.column < 0 ||
      bouncyBox.rectangle.column + bouncyBox.rectangle.width >
        background.rectangle.width
    ) {
      x *= -1;
    }

    if (
      bouncyBox.rectangle.row < 0 ||
      bouncyBox.rectangle.row + bouncyBox.rectangle.height >
        background.rectangle.height
    ) {
      y *= -1;
    }
  }
}
