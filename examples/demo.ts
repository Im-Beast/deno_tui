import { Canvas } from "../src/canvas.ts";
import { ProgressBarComponent } from "../src/components/progress_bar.ts";
import { crayon } from "../src/deps.ts";
import { handleKeyboardControls, handleKeypresses } from "../src/keyboard.ts";
import { handleMouseControls } from "../src/mouse.ts";
import { Tui } from "../src/tui.ts";

const tui = new Tui({
  style: crayon.bgHex(0x333333),
  canvas: new Canvas({
    refreshRate: 1000 / 60,
    size: await Deno.consoleSize(Deno.stdout.rid),
    stdout: Deno.stdout,
  }),
});

handleKeypresses(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);

const pb = new ProgressBarComponent({
  tui,
  direction: "horizontal",
  min: 0,
  max: 100,
  value: 50,
  rectangle: {
    column: 3,
    row: 3,
    height: 2,
    width: 30,
  },
  theme: {
    base: crayon.bgBlue,
    active: crayon.bgRed,
    focused: crayon.bgYellow,
    progress: {
      base: (text) => {
        let str = "";
        for (let i = 0; i < text.length; ++i) {
          str += crayon.bgHsl(i * (120 / pb.rectangle.width), 50, 50)(text[i]);
        }
        return str;
      },
    },
  },
});

let dir = 2;
for await (const event of tui.run()) {
  if (event.type === "update") {
    const fpsText = tui.canvas.fps.toFixed(2);

    tui.canvas.draw(0, 0, tui.style(fpsText));

    if (pb.value === pb.max || pb.value === pb.min || Math.random() < 0.02) dir *= -1;

    pb.value += dir;
  }
}
