import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";
import { clamp, EventRecord, insertAt } from "../util.ts";
import { crayon } from "../deps.ts";
import { ComponentEvent } from "../events.ts";
import { ComboboxComponent } from "./combobox.ts";

export interface TextboxComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  multiline: boolean;
  value?: string;
}

export type TextboxComponentEventMap = {
  value: ComponentEvent<"valueChange", ComboboxComponent>;
};

export class TextboxComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & TextboxComponentEventMap> {
  #value: string[] = [];
  #lastInteraction = 0;

  declare cursorPosition: {
    x: number;
    y: number;
  };
  declare multiline: boolean;

  constructor(options: TextboxComponentOptions) {
    super(options);
    this.multiline = options.multiline;
    this.#value = options.value?.split?.("\n") ?? [""];
    this.cursorPosition = { x: options.value?.length ?? 0, y: 0 };

    this.tui.addEventListener("keyPress", ({ keyPress }) => {
      if (this.state === "base") return;

      const { key, ctrl, meta } = keyPress;

      if (ctrl || meta) return;

      let { x, y } = this.cursorPosition;

      if (key.length === 1) {
        this.#value[y] = insertAt(this.#value[y], x, key);
        ++x;
      } else {
        switch (key) {
          case "space":
            this.#value[y] = insertAt(this.#value[y], ++x, " ");
            break;
          case "tab":
            this.#value[y] = insertAt(this.#value[y], ++x, "\t");
            break;
          case "home":
            x = 0;
            break;
          case "end":
            x = this.#value[y].length;
            break;
          case "up":
            x = Math.min(x, this.#value[--y]?.length ?? 0);
            break;
          case "down":
            x = Math.min(x, this.#value[++y]?.length ?? 0);
            break;
          case "left":
            x = Math.max(x - 1, 0);
            break;
          case "right":
            x = Math.min(x + 1, this.#value[y].length);
            break;
          case "backspace":
            this.#value[y] = this.#value[y].slice(0, x - 1) +
              this.#value[y].slice(x);
            --x;
            break;
          case "delete":
            this.#value[y] = this.#value[y].slice(0, x) +
              this.#value[y].slice(x + 1);
            break;
          case "return":
            if (!this.multiline) break;

            if (x === this.#value[y].length) {
              ++y;
            } else {
              this.#value.splice(
                y,
                1,
                this.#value[y].slice(0, x),
                this.#value[y].slice(x),
              );
              ++y;
              x = 0;
            }
            break;
        }
      }

      this.#value[y] ||= "";
      y = clamp(y, 0, this.#value.length);
      x = clamp(x, 0, this.#value[y].length);

      this.cursorPosition = { x, y };
      this.dispatchEvent(new ComponentEvent("valueChange", this));
    });
  }

  get value(): string {
    return this.#value.join("\n");
  }

  set value(value: string) {
    this.#value = value.split("\n");
  }

  draw() {
    const { value } = this;

    super.draw();

    if (!value) return;

    const { style } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;
    const { x, y } = this.cursorPosition;

    const offsetX = Math.max(x - width + 1, 0);
    const offsetY = Math.max(y - height + 1, 0);

    for (const [i, line] of this.#value.entries()) {
      if (i < offsetY) continue;
      if (i - offsetY >= height) break;

      canvas.draw(
        column,
        row + i - offsetY,
        style(line.slice(offsetX, offsetX + width)),
      );
    }

    if (this.state === "base") return;

    canvas.draw(
      column + Math.min(x, width - 1),
      row + Math.min(y, height - 1),
      crayon.invert(
        this.#value[y][x] ?? " ",
      ),
    );
  }

  interact() {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && interactionDelay < 500 ? "active" : "focused";

    this.#lastInteraction = now;
  }
}
