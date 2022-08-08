import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";

import { Canvas } from "../src/canvas.ts";
import { handleKeyboardControls, handleKeypresses } from "../src/keyboard.ts";
import { handleMouseControls } from "../src/mouse.ts";
import { Tui } from "../src/tui.ts";

import { BoxComponent } from "../src/components/box.ts";
import { ButtonComponent } from "../src/components/button.ts";
import { CheckboxComponent } from "../src/components/checkbox.ts";
import { ComboboxComponent } from "../src/components/combobox.ts";
import { FrameComponent } from "../src/components/frame.ts";
import { ProgressBarComponent } from "../src/components/progress_bar.ts";
import { SliderComponent } from "../src/components/slider.ts";
import { TextboxComponent } from "../src/components/textbox.ts";
import { Theme } from "../src/theme.ts";
import { LabelComponent } from "../src/components/label.ts";

const baseTheme: Theme = {
  base: crayon.bgLightBlue,
  focused: crayon.bgCyan,
  active: crayon.bgBlue,
};

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

new BoxComponent({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 2,
    row: 3,
    height: 5,
    width: 10,
  },
});

new ButtonComponent({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 15,
    row: 3,
    height: 5,
    width: 10,
  },
});

new CheckboxComponent({
  tui,
  theme: baseTheme,
  rectangle: {
    column: 28,
    row: 3,
    height: 1,
    width: 1,
  },
});

new ComboboxComponent({
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

new ComboboxComponent({
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

const progressBar1 = new ProgressBarComponent({
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

new LabelComponent({
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
  theme: {
    base: tui.style,
  },
  value: "Centered text\nThat automatically adjusts its rectangle size\n!@#!\nSo cool\nWOW",
});

const progressBar2 = new ProgressBarComponent({
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

new SliderComponent({
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

new SliderComponent({
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

new TextboxComponent({
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
  theme: baseTheme,
  multiline: true,
  hidden: false,
  rectangle: {
    column: 29,
    row: 11,
    height: 5,
    width: 10,
  },
  value: "hello!\nwhats up?",
});

// Generate frames and labels for every component

queueMicrotask(() => {
  for (const component of tui.components) {
    const { rectangle } = component;
    if (!rectangle) continue;

    const name = component.constructor.name.replace("Component", "");

    new LabelComponent({
      tui,
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
      theme: {
        base: tui.style,
      },
      value: name,
    });

    new FrameComponent({
      tui,
      component,
      rounded: true,
      theme: {
        base: crayon.bgHex(0x333333).white,
        focused: crayon.bgHex(0x333333).bold,
      },
    });
  }
});

let direction = 1;
let avgFps = 60;
for await (const event of tui.run()) {
  if (event.type === "update") {
    avgFps = ((avgFps * 99) + tui.canvas.fps) / 100;
    const fpsText = `${avgFps.toFixed(2)} FPS`;
    tui.canvas.draw(0, 0, baseTheme.base(fpsText));

    if (progressBar1.value === progressBar1.max || progressBar1.value === progressBar1.min) {
      direction *= -1;
    }

    progressBar1.value += direction;
    progressBar2.value += direction;
  }
}
