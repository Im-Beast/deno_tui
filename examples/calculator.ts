// Copyright 2023 Im-Beast. MIT license.
// Simple calculator demo using grid layout

import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";

import { Tui } from "../src/tui.ts";
import { handleInput } from "../src/input.ts";
import { handleKeyboardControls, handleMouseControls } from "../src/controls.ts";

import { Button } from "../src/components/button.ts";

import { GridLayout, Signal } from "../mod.ts";

const tui = new Tui({
  style: crayon.bgBlack,
  refreshRate: 1000 / 60,
});

handleInput(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
tui.dispatch();
tui.run();

const layout = new GridLayout(
  {
    pattern: [
      ["screen", "screen", "screen", "screen"],
      ["off", "clear", "%", "/"],
      ["7", "8", "9", "*"],
      ["4", "5", "6", "-"],
      ["1", "2", "3", "+"],
      ["0", ".", "=", "+"],
    ],
    gapX: 0,
    gapY: 0,
    rectangle: tui.rectangle,
  },
);

type ElementName = typeof layout["elementNameToIndex"] extends Map<infer K, unknown> ? K : never;

const buttons: Record<ElementName, Button> = {} as Record<ElementName, Button>;

const colors: Partial<Record<ElementName, number>> = {
  "screen": 0x000000,
  "off": 0x8f5353,
  "clear": 0x53538f,
  "%": 0x474747,
  "/": 0x535353,
  "*": 0x474747,
  "-": 0x535353,
  "+": 0x474747,
  "=": 0x538f53,
};

let lastClickedType: "number" | "action" | "result" = "action";
const expression = new Signal("");

let i = 0;
for (const elementName of layout.elementNameToIndex.keys()) {
  const rectangle = layout.element(elementName as ElementName);

  i++;

  const color = colors[elementName] ?? (i % 2 === 0 ? 0x323232 : 0x373737);

  const button = new Button({
    parent: tui,
    theme: {
      base: crayon.bgHex(color),
      focused: crayon.bgHex(color + 0x101010),
      active: crayon.bgHex(color + 0x303030),
    },
    rectangle,
    zIndex: 1,
    label: {
      text: elementName === "screen" ? expression : elementName,
      align: {
        vertical: "center",
        horizontal: elementName === "screen" ? "left" : "center",
      },
    },
  });

  switch (elementName) {
    case "screen":
      break;
    case "off":
      button.state.when("active", () => {
        tui.emit("destroy");
      });
      break;
    case "=":
      button.state.when("active", () => {
        if (lastClickedType === "number") {
          const calc = new Function("", `return ${expression.peek()};`);
          expression.value = calc().toString();
          lastClickedType = "result";
        }
      });
      break;
    case "clear":
      button.state.when("active", () => {
        expression.value = "";
      });
      break;
    default:
      button.state.when("active", () => {
        const currentType = /\d/.test(elementName) ? "number" : "action";

        if (currentType !== "action" || (lastClickedType === "number" && currentType === "action")) {
          expression.value += elementName;
          lastClickedType = currentType;
        }
      });
      break;
  }

  buttons[elementName] = button;
}
