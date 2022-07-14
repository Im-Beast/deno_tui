import { Canvas } from "../src/canvas.ts";
import { TextboxComponent } from "../src/components/textbox.ts";
import { crayon } from "../src/deps.ts";
import { handleKeypresses } from "../src/keyboard.ts";
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

new TextboxComponent({
  tui,
  rectangle: {
    column: 3,
    row: 3,
    width: 10,
    height: 5,
  },
  theme: {
    base: crayon.bgHex(0x111111),
    focused: crayon.bgHex(0x222222),
    active: crayon.bgRed,
  },
  multiline: true,
});

for await (const _ of tui.run()) {
  //
}
