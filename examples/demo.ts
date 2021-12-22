// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  ButtonComponent,
  capitalize,
  compileStyler,
  createBox,
  createButton,
  createCheckbox,
  createCombobox,
  createFrame,
  createLabel,
  createMenu,
  createMenuItem,
  createMenuList,
  createTextbox,
  createTui,
  draw,
  handleKeyboardControls,
  handleKeypresses,
  handleMouseControls,
  hsl,
  removeComponent,
  textWidth,
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
  frame: {
    foreground: "white",
    background: "black",
  },
});

const componentStyler = compileStyler<TuiStyler>({
  ...tuiStyler,
  background: "blue",
});

const tui = createTui(Deno.stdin, Deno.stdout, {
  styler: tuiStyler,
});

handleKeypresses(tui);
handleKeyboardControls(tui);
handleMouseControls(tui);
draw(tui);

const menu = createMenu(tui, {
  styler: componentStyler,
});

createMenuList(menu, {
  label: {
    text: "File",
  },
  items: ["Open", "Save", "Close"],
  // When styler property is missing it is inherited from parent
});

const help = createMenuItem(menu, {
  label: {
    text: "Help",
  },
});

help.on("active", () => {
  helpHidden = !helpHidden;
  if (helpHidden) removeComponent(helpMessage);
  else createHelpButton();
});

let helpHidden = true;
let helpMessage: ButtonComponent;

const createHelpButton = () => {
  helpMessage = createButton(help, {
    // Set dynamic properties as functions so they'll be reactive!
    get rectangle() {
      const { width, height } = tui.rectangle;
      return {
        column: ~~(width / 4),
        row: ~~((height - 1) / 4),
        width: ~~(width / 2),
        height: ~~((height - 1) / 2),
      };
    },
    label: {
      text:
        `There would be an help message.\nHowever its just demo to show Deno TUI possibilities.`,
    },
    drawPriority: 4, // draw over components with lower priority (default 0)
  });
  helpMessage.interactive = false;
};

createBox(tui, {
  rectangle: {
    column: 2,
    row: 2,
    width: 5,
    height: 4,
  },
  styler: componentStyler,
});

createFrame(tui, {
  rectangle: {
    column: 1,
    row: 1,
    width: 6,
    height: 5,
  },
  styler: componentStyler.frame,
});

createLabel(tui, {
  rectangle: {
    column: 1,
    row: 8,
    width: 50,
    height: 2,
  },
  value: {
    text: "↓ This is label\nＱuick Ｂrown Ｆox\njumped over the lazy dog.",
    align: {
      vertical: "top",
      horizontal: "left",
    },
  },
});

createCheckbox(tui, {
  rectangle: {
    column: 28,
    row: 2,
    width: 1,
    height: 1,
  },
  value: false,
  styler: componentStyler,
});

createCheckbox(tui, {
  rectangle: {
    column: 28,
    row: 5,
    width: 1,
    height: 1,
  },
  value: true,
  styler: componentStyler,
});

createCombobox(tui, {
  items: ["one", "two", "three", "four", { label: "five", value: 5 }],
  rectangle: {
    column: 55,
    row: 2,
    width: 9,
    height: 1,
  },
  styler: componentStyler,
});

createTextbox(tui, {
  rectangle: {
    column: 55,
    row: 5,
    width: 9,
    height: 1,
  },
  value: ["visible"],
  hidden: false,
  multiline: false,
  styler: componentStyler,
});

createTextbox(tui, {
  rectangle: {
    column: 55,
    row: 8,
    width: 9,
    height: 1,
  },
  value: ["hidden"],
  hidden: true,
  multiline: false,
  styler: componentStyler,
});

createTextbox(tui, {
  rectangle: {
    column: 55,
    row: 11,
    width: 9,
    height: 3,
  },
  value: ["it", "is", "multiline", "overline", "overtwolines"],
  hidden: false,
  multiline: true,
  styler: componentStyler,
});

createTextbox(tui, {
  rectangle: {
    column: 68,
    row: 8,
    width: 9,
    height: 3,
  },
  value: ["it", "is", "hidden"],
  hidden: true,
  multiline: true,
  styler: componentStyler,
});

createButton(tui, {
  rectangle: {
    column: 28,
    row: 8,
    width: 7,
    height: 3,
  },
  label: {
    text: "click",
  },
  styler: componentStyler,
});

const specifiedComponents: string[] = [];
for (const component of tui.children) {
  if (
    component.name === "label" ||
    specifiedComponents.some((x) => x === component.name)
  ) {
    continue;
  }

  specifiedComponents.push(component.name);

  const rectangle = component.rectangle;
  const message = `← This is ${capitalize(component.name)}`;

  createLabel(component, {
    rectangle: {
      column: rectangle.column + rectangle.width + 2,
      row: rectangle.row,
      width: textWidth(message),
      height: 1,
    },
    value: {
      text: message,
      align: {
        horizontal: "center",
        vertical: "center",
      },
    },
    styler: tuiStyler,
  });
}

createLabel(tui, {
  value: {
    get text() {
      return `FPS: ${tui.canvas.fps.toFixed(2)}`;
    },
    align: {
      horizontal: "left",
      vertical: "top",
    },
  },
  get rectangle() {
    const rectangle = tui.rectangle;
    const width = textWidth(this.value.text);
    return {
      ...rectangle,
      column: rectangle.width - width,
      height: 1,
      row: 0,
    };
  },
  drawPriority: 1,
  styler: componentStyler,
});

let h = 0;
setInterval(() => {
  if (componentStyler.frame) {
    componentStyler.background = hsl((++h + 180) % 360, 50, 50, true);
    componentStyler.frame.background = hsl(++h % 360, 50, 50);
  }
}, 32);
