// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component } from "../component.ts";
import { Theme } from "../theme.ts";
import { Tui } from "../tui.ts";
import { Rectangle } from "../types.ts";
import { EventRecord } from "../utils/typed_event_target.ts";

export const sharpFramePieces = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
} as const;

export const roundedFramePieces = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
} as const;

export type FramePieceType = {
  [key in keyof typeof sharpFramePieces]: string;
};

export type FrameComponentOptions =
  & {
    tui: Tui;
    theme?: Partial<Theme>;
    framePieces?: "sharp" | "rounded" | FramePieceType;
  }
  & (
    { rectangle?: never; component: Component } | { component?: never; rectangle: Rectangle }
  );

export class FrameComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  component?: Component;
  framePieces: "sharp" | "rounded" | FramePieceType;

  constructor(
    { tui, component, rectangle, theme, framePieces }: FrameComponentOptions,
  ) {
    super({
      tui,
      rectangle,
      theme: theme ?? component?.theme,
      zIndex: component?.zIndex,
    });
    this.component = component;
    this.framePieces = framePieces ?? "sharp";
  }

  set state(_value) {}

  get state() {
    return this.component?.state ?? "base";
  }

  draw() {
    super.draw();

    const { style, framePieces } = this;
    const { canvas } = this.tui;
    let { column, row, width, height } = (this.rectangle ?? this.component?.rectangle)!;

    column -= 1;
    row -= 1;
    width += 1;
    height += 1;

    const pieces = framePieces === "sharp"
      ? sharpFramePieces
      : framePieces === "rounded"
      ? roundedFramePieces
      : framePieces;

    canvas.draw(column, row, style(pieces.topLeft));
    canvas.draw(column + width, row, style(pieces.topRight));
    canvas.draw(column, row + height, style(pieces.bottomLeft));
    canvas.draw(column + width, row + height, style(pieces.bottomRight));

    for (let x = column + 1; x < column + width; ++x) {
      canvas.draw(x, row, style(pieces.horizontal));
      canvas.draw(x, row + height, style(pieces.horizontal));
    }

    for (let y = row + 1; y < row + height; ++y) {
      canvas.draw(column, y, style(pieces.vertical));
      canvas.draw(column + width, y, style(pieces.vertical));
    }
  }
}
