// Copyright 2022 Im-Beast. All rights reserved. MIT license.
// Example of creating your own component by extending provided ones

import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";

import { handleControls, handleInput, PlaceComponentOptions, Tui } from "../mod.ts";
import { Box } from "../src/components/box.ts";

const tui = new Tui({
  style: crayon.bgBlack.white,
});

tui.dispatch();

handleInput(tui);
handleControls(tui);

class DraggableBoxComponent extends Box {
  constructor(options: PlaceComponentOptions) {
    super(options);

    // Make it respond on quick movements faster
    this.forceDynamicDrawing = true;

    tui.on("mousePress", ({ drag, x, y }) => {
      if (!drag || this.state === "base") return;

      this.rectangle.column = x;
      this.rectangle.row = y;
    });
  }

  // Make component interactable
  interact(): void {
    this.state = "focused";
  }
}

new DraggableBoxComponent({
  tui,
  theme: {
    base: crayon.bgBlue,
    focused: crayon.bgLightBlue,
  },
  rectangle: {
    column: 1,
    row: 1,
    width: 6,
    height: 3,
  },
});

new DraggableBoxComponent({
  tui,
  theme: {
    base: crayon.bgYellow,
    focused: crayon.bgLightYellow,
  },
  rectangle: {
    column: 1,
    row: 1,
    width: 6,
    height: 3,
  },
  zIndex: 1,
});

new DraggableBoxComponent({
  tui,
  theme: {
    base: crayon.bgMagenta,
    focused: crayon.bgLightMagenta,
  },
  rectangle: {
    column: 1,
    row: 1,
    width: 6,
    height: 3,
  },
  zIndex: 2,
});

new DraggableBoxComponent({
  tui,
  theme: {
    base: crayon.bgGreen,
    focused: crayon.bgLightGreen,
  },
  rectangle: {
    column: 1,
    row: 1,
    width: 6,
    height: 3,
  },
  zIndex: 3,
});

tui.run();
