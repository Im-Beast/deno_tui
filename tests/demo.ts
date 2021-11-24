import {
  compileStyler,
  createBox,
  createButton,
  createCheckbox,
  createCombobox,
  createFrame,
  createLabel,
  createMenu,
  createMenuItem,
  createTextbox,
  createTui,
  getStaticValue,
  handleKeyboardControls,
  handleKeypresses,
  keyword,
  rgb,
  TuiStyler,
} from "../mod.ts";

const mainStyler = compileStyler<TuiStyler>({
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
  frame: {
    foreground: "white",
    background: "black",
  },
});

const componentStyler: TuiStyler = {
  ...mainStyler,
  background: keyword("bgBlue"),
};

const tui = createTui(Deno.stdin, Deno.stdout, {
  styler: mainStyler,
  refreshRate: 32,
});

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

createBox(tui, {
  rectangle: {
    column: 15,
    row: 15,
    width: 2,
    height: 1,
  },
  styler: () => ({
    background: rgb(
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
      true,
    ),
  }),
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
      background: keyword("green"),
      foreground: keyword("black"),
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
  value: 2,
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
    row: 1 + pos.row,
    height: 3,
    width: 6,
  }),
  text: () => `${(Math.round(Math.random() * 1e5)).toString(32)}`,
  styler: componentStyler,
});
dynamicButton.interactive = false;

setInterval(() => {
  pos.col += 1 * dir.col;
  pos.row += 1 * dir.row;

  const { row, column, width, height } = getStaticValue(
    dynamicButton.rectangle,
  );
  const { height: tuiHeight, width: tuiWidth } = tui.rectangle();

  if (row >= tuiHeight - height || row <= 0) {
    dir.row *= -1;
  }

  if (column >= tuiWidth - width || column <= 0) {
    dir.col *= -1;
  }
}, 16);

createFrame(tui, {
  rectangle: {
    column: 100,
    row: 2,
    height: 8,
    width: 10,
  },
  label: "hi",
  styler: componentStyler,
});
