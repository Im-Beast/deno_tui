import {
  createBox,
  createButton,
  createCheckbox,
  createLabel,
  createMenu,
  createMenuItem,
  createTextbox,
  createTui,
  handleKeyboardControls,
  handleKeypresses,
  TuiStyler,
} from "../mod.ts";

const mainStyler: TuiStyler = {
  foreground: "white",
  background: "black",
  focused: {
    attributes: ["bold"],
    background: "lightBlue",
  },
  active: {
    attributes: ["bold", "italic"],
    foreground: "black",
    background: "lightCyan",
  },
  border: {
    foreground: "white",
    background: "black",
  },
};

const componentStyler: TuiStyler = {
  ...mainStyler,
  background: "blue",
};

const tui = createTui(Deno.stdin, Deno.stdout, mainStyler);
handleKeypresses(tui);
handleKeyboardControls(tui);

const button = createButton(tui, {
  rectangle: {
    column: 3,
    row: 2,
    width: 10,
    height: 5,
  },
  styler: componentStyler,
  text: "Click me",
  textAlign: {
    vertical: "center",
    horizontal: "center",
  },
});

tui.selected.item = button;

const box = createBox(tui, {
  rectangle: {
    column: 16,
    row: 2,
    width: 12,
    height: 3,
  },
  styler: componentStyler,
});

createLabel(box, {
  text: "Test label",
  rectangle: {
    column: 17,
    row: 3,
    width: 10,
    height: 2,
  },
  textAlign: {
    horizontal: "right",
    vertical: "center",
  },
  styler: componentStyler,
});

createCheckbox(tui, {
  column: 3,
  row: 10,
  default: false,
  styler: componentStyler,
});

createCheckbox(tui, {
  column: 7,
  row: 10,
  default: true,
  styler: componentStyler,
});

createCheckbox(tui, {
  column: 11,
  row: 10,
  default: false,
  styler: {
    ...componentStyler,
    active: {
      background: "green",
      foreground: "black",
    },
  },
});

createTextbox(tui, {
  hidden: false,
  multiline: false,
  rectangle: {
    column: 17,
    row: 7,
    width: 10,
    height: 1,
  },
  styler: componentStyler,
});

createTextbox(tui, {
  hidden: true,
  multiline: false,
  rectangle: {
    column: 17,
    row: 10,
    width: 10,
    height: 1,
  },
  styler: componentStyler,
});

const menu = createMenu(tui, {
  styler: componentStyler,
});

createMenuItem(menu, {
  styler: componentStyler,
  text: "Uno",
});

createMenuItem(menu, {
  styler: componentStyler,
  text: "Dos",
});

createMenuItem(menu, {
  styler: componentStyler,
  text: "Tres",
});
