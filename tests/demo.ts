import {
  createBox,
  createButton,
  createCheckbox,
  createCombobox,
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
    background: "green",
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
  rectangle: {
    column: 3,
    row: 10,
    width: 1,
    height: 1,
  },
  default: false,
  styler: componentStyler,
});

createCheckbox(tui, {
  rectangle: {
    column: 7,
    row: 10,
    width: 1,
    height: 1,
  },
  default: true,
  styler: componentStyler,
});

createCheckbox(tui, {
  rectangle: {
    column: 11,
    row: 10,
    width: 1,
    height: 1,
  },
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

createCombobox(tui, {
  items: ["uno", "dos", "tres", { label: "quatro", value: 4 }],
  defaultValue: 2,
  rectangle: {
    column: 40,
    row: 3,
    width: 6,
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

const pos = { col: 0, row: 0 };
const dir = { col: 1, row: 1 };
const dynamicButton = createButton(tui, {
  drawPriority: 50,
  rectangle: () => ({
    column: 30 + pos.col,
    row: 10 + pos.row,
    height: 3,
    width: 6,
  }),
  text: () => `${(Math.round(Math.random() * 1e5)).toString(32)}`,
  styler: componentStyler,
});

setInterval(() => {
  pos.col += 1 * dir.col;
  pos.row += 1 * dir.row;

  const { row, column, width, height } = dynamicButton.staticRectangle;

  if (row >= tui.rectangle.height - height || row <= 0) {
    dir.row *= -1;
  }

  if (column >= tui.rectangle.width - width || column <= 0) {
    dir.col *= -1;
  }
}, 100);

let last = Date.now();
let avg = 60;
createLabel(tui, {
  rectangle: () => ({
    ...tui.rectangle,
    height: 0,
    column: tui.rectangle.width - 15,
  }),
  styler: componentStyler,
  text: () => {
    avg = ((avg * 6) + Date.now() - last) / 7;
    last = Date.now();
    return `AVG FPS: ${(1000 / avg).toFixed(2)}`;
  },
  textAlign: {
    horizontal: "left",
    vertical: "top",
  },
});
