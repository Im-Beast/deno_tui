import * as Tui from "../mod.ts";
import type { TuiStyler } from "../mod.ts";
import { handleKeyboardControls, handleKeypresses } from "../mod.ts";

const styler: TuiStyler = {
  foreground: "white",
  background: "blue",
};

const tui = Tui.createTui(Deno.stdin, Deno.stdout, styler);
handleKeypresses(tui);
handleKeyboardControls(tui);

Tui.createTextbox(tui, {
  focusedWithin: [],
  rectangle: {
    column: 40,
    row: 1,
    height: 1,
    width: 10,
  },
  hidden: false,
  multiline: false,
  styler: {
    background: "red",
    foreground: "white",
    active: {
      background: "green",
      foreground: "white",
    },
    border: {
      background: "yellow",
      foreground: "cyan",
      active: {
        background: "black",
        foreground: "white",
      },
      focused: {
        background: "magenta",
        foreground: "lightMagenta",
      },
    },
    focused: {
      foreground: "green",
      background: "lightWhite",
    },
  },
});

Tui.createTextbox(tui, {
  focusedWithin: [],

  rectangle: {
    column: 10,
    row: 1,
    height: 1,
    width: 10,
  },
  hidden: false,
  multiline: false,
  styler: {
    background: "red",
    foreground: "white",
    active: {
      background: "green",
      foreground: "white",
    },
    border: {
      background: "yellow",
      foreground: "cyan",
    },
    focused: {
      foreground: "green",
      background: "lightWhite",
    },
  },
});

Tui.createButton(tui, {
  focusedWithin: [],

  rectangle: {
    column: 5,
    row: 5,
    width: 10,
    height: 5,
  },
  text: "hello",
  styler: {
    background: "red",
    foreground: "white",
    focused: {
      background: "green",
      foreground: "white",
    },
    active: {
      background: "lightGreen",
      foreground: "white",
    },
  },
});

Tui.createCheckbox(tui, {
  focusedWithin: [],
  default: false,
  column: 2,
  row: 2,
  styler: {
    background: "red",
    foreground: "white",
    active: {
      background: "green",
      foreground: "white",
    },
    border: {
      background: "yellow",
      foreground: "green",
      focused: {
        background: "magenta",
        foreground: "lightBlue",
      },
    },
  },
});
