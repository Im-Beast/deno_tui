import { Component } from "../component.ts";
import { Theme } from "../theme.ts";
import { Tui } from "../tui.ts";
import { Rectangle } from "../types.ts";
import { EventRecord } from "../util.ts";

export enum SharpFramePieces {
  TopLeft = "┌",
  TopRight = "┐",
  BottomLeft = "└",
  BottomRight = "┘",
  Horizontal = "─",
  Vertical = "│",
}

export enum RoundedFramePieces {
  TopLeft = "╭",
  TopRight = "╮",
  BottomLeft = "╰",
  BottomRight = "╯",
  Horizontal = "─",
  Vertical = "│",
}

export type FrameComponentOptions = {
  tui: Tui;
  component: Component;
  rectangle?: never;
  theme?: Partial<Theme>;
  rounded?: boolean;
} | {
  tui: Tui;
  component?: never;
  rectangle: Rectangle;
  theme?: Partial<Theme>;
  rounded?: boolean;
};

export class FrameComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> {
  declare component?: Component;
  declare rounded: boolean;

  constructor(
    { tui, component, rectangle, theme, rounded }: FrameComponentOptions,
  ) {
    super({
      tui,
      rectangle,
      theme: theme ?? component?.theme,
      zIndex: component?.zIndex,
    });
    this.component = component;
    this.rounded = rounded ?? false;
  }

  draw() {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui;
    let { column, row, width, height } = (this.rectangle ?? this.component?.rectangle)!;

    column -= 1;
    row -= 1;
    width += 1;
    height += 1;

    const pieces = this.rounded ? RoundedFramePieces : SharpFramePieces;

    canvas.draw(column, row, style(pieces.TopLeft));
    canvas.draw(column + width, row, style(pieces.TopRight));
    canvas.draw(column, row + height, style(pieces.BottomLeft));
    canvas.draw(column + width, row + height, style(pieces.BottomRight));

    for (let x = column + 1; x < column + width; ++x) {
      canvas.draw(x, row, style(pieces.Horizontal));
      canvas.draw(x, row + height, style(pieces.Horizontal));
    }

    for (let y = row + 1; y < row + height; ++y) {
      canvas.draw(column, y, style(pieces.Vertical));
      canvas.draw(column + width, y, style(pieces.Vertical));
    }
  }
}
