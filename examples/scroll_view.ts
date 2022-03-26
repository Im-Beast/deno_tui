// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  compileStyler,
  createButton,
  createScrollableView,
  createTui,
  handleKeyboardControls,
  handleKeypresses,
  handleMouseControls,
  loopDrawing,
  ScrollableViewStyler,
  TuiStyler,
} from "../mod.ts";

const tuiStyler = compileStyler<TuiStyler>({
  foreground: "white",
  background: "black",
  focused: {
    attributes: ["bold"],
    background: "green",
  },
  active: {
    attributes: ["bold", "italic"],
    foreground: "black",
    background: "lightCyan",
  },
});

const componentStyler = compileStyler<TuiStyler>({
  ...tuiStyler as TuiStyler,
  background: "blue",
});

const tui = createTui({
  reader: Deno.stdin,
  writer: Deno.stdout,
  styler: tuiStyler,
});

handleKeypresses(tui);
handleKeyboardControls(tui);
handleMouseControls(tui);

const scrollView = createScrollableView(tui, {
  get rectangle() {
    return {
      column: 5,
      row: 2,
      width: 25,
      height: tui.rectangle.height - 5,
    };
  },
  styler: compileStyler<ScrollableViewStyler>({
    background: "bgLightBlack",
    vertical: {
      track: {
        background: "bgYellow",
      },
      thumb: {
        background: "bgCyan",
      },
    },
    horizontal: {
      thumb: {
        background: "magenta",
      },
      track: {
        background: "red",
      },
    },
    corner: {
      background: "cyan",
    },
  }),
});

createButton(scrollView, {
  rectangle: {
    row: 3,
    column: 10,
    width: 5,
    height: 3,
  },
  styler: componentStyler,
});

createButton(scrollView, {
  rectangle: {
    row: 9,
    column: 10,
    width: 5,
    height: 3,
  },
  styler: componentStyler,
});

createButton(scrollView, {
  rectangle: {
    row: 15,
    column: 10,
    width: 5,
    height: 3,
  },
  styler: componentStyler,
});

createButton(scrollView, {
  rectangle: {
    row: 15,
    column: 100,
    width: 5,
    height: 3,
  },
  styler: componentStyler,
});

loopDrawing(tui);
