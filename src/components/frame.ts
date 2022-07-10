import { Component, ComponentEventMap } from "../component.ts";
import { Theme } from "../theme.ts";
import { Tui } from "../tui.ts";
import { Rectangle } from "../types.ts";

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
  EventMap extends ComponentEventMap = ComponentEventMap,
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

    const { canvas } = this.tui;
    let { column, row, width, height } =
      (this.rectangle ?? this.component?.rectangle)!;

    column -= 1;
    row -= 1;
    width += 1;
    height += 1;

    const color = this.style;
    const pieces = this.rounded ? RoundedFramePieces : SharpFramePieces;

    canvas.draw(column, row, color(pieces.TopLeft));
    canvas.draw(column + width, row, color(pieces.TopRight));
    canvas.draw(column, row + height, color(pieces.BottomLeft));
    canvas.draw(column + width, row + height, color(pieces.BottomRight));

    for (let x = column + 1; x < column + width; ++x) {
      canvas.draw(x, row, color(pieces.Horizontal));
      canvas.draw(x, row + height, color(pieces.Horizontal));
    }

    for (let y = row + 1; y < row + height; ++y) {
      canvas.draw(column, y, color(pieces.Vertical));
      canvas.draw(column + width, y, color(pieces.Vertical));
    }
  }
}
