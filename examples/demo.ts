import { Canvas } from "../src/canvas.ts";
import { ButtonComponent } from "../src/components/button.ts";
import { ScrollableViewComponent } from "../src/components/scrollable_view.ts";
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

const view = new ScrollableViewComponent({
  tui,
  rectangle: {
    column: 20,
    row: 3,
    height: 10,
    width: 20,
  },
  theme: {
    base: crayon.bgBlue,
    scrollbar: {
      vertical: {
        track: crayon.bgYellow,
        thumb: crayon.bgRed,
      },
      horizontal: {
        track: crayon.bgMagenta,
        thumb: crayon.bgRed,
      },
      corner: crayon.bgLightGreen,
    },
  },
  zIndex: 1,
});

new ButtonComponent({
  tui: view.tui,
  rectangle: {
    column: 20,
    row: 10,
    width: 10,
    height: 3,
  },
  theme: {
    base: crayon.bgLightGreen,
    focused: crayon.bgLightCyan,
    active: crayon.bgLightMagenta,
  },
  zIndex: 5,
});

for await (const _ of tui.run()) {
  tui.canvas.draw(0, 0, tui.canvas.fps.toFixed(2));
}
