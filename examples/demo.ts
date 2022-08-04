import { Canvas } from "../src/canvas.ts";
import { crayon } from "../src/deps.ts";
import { ButtonComponent } from "../src/components/button.ts";
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

for (let i = 0; i < 30; ++i) {
  const col = ~~(i % 10) * 10;
  const row = ~~(i / 10) * 5;

  new ButtonComponent({
    tui,
    rectangle: {
      column: col,
      row,
      height: 5,
      width: 10,
    },
    theme: {
      base: crayon.bgHex(Math.random() * 0xffffff).black,
      focused: crayon.bgRed,
      active: crayon.bgYellow,
    },
    label: `(${i})`,
  });
}

for await (const event of tui.run()) {
  if (event.type === "update") {
    tui.canvas.draw(
      0,
      0,
      tui.style(tui.canvas.fps.toFixed(2)),
    );
  }
}
