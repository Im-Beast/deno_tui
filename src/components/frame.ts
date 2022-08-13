// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions } from "../component.ts";

import { EventRecord } from "../utils/typed_event_target.ts";

import type { Rectangle } from "../types.ts";

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
  & ComponentOptions
  & {
    framePieces?: "sharp" | "rounded" | FramePieceType;
  }
  & (
    { rectangle?: never; component: Component } | { component?: never; rectangle: Rectangle }
  );

export class FrameComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  component?: Component;
  framePieces: "sharp" | "rounded" | FramePieceType;

  #initialRectangle?: Rectangle;

  constructor({ tui, view, component, rectangle, theme, framePieces, zIndex }: FrameComponentOptions) {
    super({
      tui,
      view,
      rectangle,
      theme: theme ?? component?.theme,
      zIndex: zIndex ?? component?.zIndex,
    });
    this.component = component;
    this.framePieces = framePieces ?? "sharp";

    this.#initialRectangle = this.rectangle;
    this.rectangle = (this.rectangle ?? this.component?.rectangle)!;
    this.rectangle = {
      column: this.rectangle.column - 1,
      row: this.rectangle.row - 1,
      width: this.rectangle.width + 2,
      height: this.rectangle.height + 2,
    };

    if (!this.rectangle && !this.component?.rectangle) {
      throw new Error("You need to pass either rectangle or component that has rectangle to FrameComponent");
    }
  }

  set state(_value) {}

  get state() {
    return this.component?.state ?? "base";
  }

  draw() {
    super.draw();

    const { style, framePieces } = this;
    const { canvas } = this.component?.tui ?? this.tui;

    this.rectangle = this.#initialRectangle;
    this.rectangle = (this.rectangle ?? this.component?.rectangle)!;
    let { column, row, width, height } = this.rectangle;
    column -= 1;
    row -= 1;
    width += 2;
    height += 2;
    this.rectangle = { column, row, width, height };

    const pieces = framePieces === "sharp"
      ? sharpFramePieces
      : framePieces === "rounded"
      ? roundedFramePieces
      : framePieces;

    canvas.draw(column, row, style(pieces.topLeft));
    canvas.draw(column + width - 1, row, style(pieces.topRight));

    for (let y = row + 1; y < row + height - 1; ++y) {
      canvas.draw(column, y, style(pieces.vertical));
      canvas.draw(column + width - 1, y, style(pieces.vertical));
    }

    for (let x = column + 1; x < column + width - 1; ++x) {
      canvas.draw(x, row, style(pieces.horizontal));
      canvas.draw(x, row + height - 1, style(pieces.horizontal));
    }

    canvas.draw(column, row + height - 1, style(pieces.bottomLeft));
    canvas.draw(column + width - 1, row + height - 1, style(pieces.bottomRight));
  }
}
