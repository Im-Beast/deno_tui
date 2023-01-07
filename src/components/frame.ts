// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions, ComponentState } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";

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

/** Type that specifies structore of object that defines how frame looks like  */
export type FramePieceType = {
  [key in keyof typeof sharpFramePieces]: string;
};

/** Interface defining object that {Frame}'s constructor can interpret */
export type FrameOptions =
  & ComponentOptions
  & {
    /** Option that changes from characters from which {Frame} is built */
    framePieces?: "sharp" | "rounded" | FramePieceType;
  }
  & (
    {
      rectangle?: never;
      /** Component that {Frame} will surround */
      component: Component;
    } | {
      component?: never;
      rectangle: Rectangle;
    }
  );

/** Complementary interface defining what's accessible in {Frame} class in addition to {FrameOptions} */
export interface FramePrivate {
  framePieces: "sharp" | "rounded" | FramePieceType;
  rectangle: Rectangle;
  component?: Component;
}

/** Implementation for {Frame} class */
export type FrameImplementation = FramePrivate;

/** Component that creates frame border either around a `component` or within `rectangle` depending on what's specified */
export class Frame<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> implements FrameImplementation {
  #component?: Component;
  #rectangle?: Rectangle;

  framePieces: "sharp" | "rounded" | FramePieceType;

  constructor(options: FrameOptions) {
    super({
      tui: options.tui,
      view: options.view,
      rectangle: options.rectangle,
      theme: options.theme ?? options.component?.theme,
      zIndex: options.zIndex ?? options.component?.zIndex,
    });

    this.component = options.component;
    if (!this.#component) {
      this.rectangle = options.rectangle!;
    }

    this.view ??= this.component?.view;

    this.framePieces = options.framePieces ?? "sharp";

    if (!this.#rectangle) {
      throw new Error("You need to pass either rectangle or component that has its rectangle set to Frame");
    }
  }

  get rectangle(): Rectangle {
    if (!this.#component) {
      return this.#rectangle!;
    }

    const { column, row, width, height } = this.#component.rectangle!;

    return {
      column: column - 1,
      row: row - 1,
      width: width + 2,
      height: height + 2,
    };
  }

  set rectangle(rectangle: Rectangle) {
    this.#rectangle = rectangle;
  }

  get component(): Component | undefined {
    return this.#component;
  }

  set component(component: Component | undefined) {
    this.#component = component;

    if (!this.#component) return;
    if (!this.#component.rectangle) {
      throw new Error("You need component that has its rectangle set");
    }

    this.rectangle = this.#component.rectangle;
    this.view = this.#component.view;
  }

  get state(): ComponentState {
    return this.component?.state ?? "base";
  }

  set state(_value) {}

  draw(): void {
    super.draw();

    const { style, framePieces, zIndex } = this;
    const { canvas } = this.component?.tui ?? this.tui;

    const { column, row, width, height } = this.rectangle;

    const pieces = framePieces === "sharp"
      ? sharpFramePieces
      : framePieces === "rounded"
      ? roundedFramePieces
      : framePieces;

    // canvas.draw(column, row, style(pieces.topLeft), this);
    // canvas.draw(column + width - 1, row, style(pieces.topRight), this);

    canvas.drawBox({
      rectangle: {
        column,
        row,
        width,
        height: 1,
      },
      style,
      zIndex,
      filler: pieces.horizontal,
    });

    canvas.drawBox({
      rectangle: {
        column,
        row: row + height - 1,
        width,
        height: 1,
      },
      style,
      zIndex,
      filler: pieces.horizontal,
    });

    canvas.drawBox({
      rectangle: {
        column,
        row,
        width: 1,
        height,
      },
      style,
      zIndex,
      filler: pieces.vertical,
    });

    canvas.drawBox({
      rectangle: {
        column: column + width - 1,
        row,
        width: 1,
        height,
      },
      style,
      zIndex,
      filler: pieces.vertical,
    });

    canvas.drawBox({
      rectangle: {
        column,
        row,
        width: 1,
        height: 1,
      },
      style,
      zIndex,
      filler: pieces.topLeft,
    });

    canvas.drawBox({
      rectangle: {
        column: column + width - 1,
        row,
        width: 1,
        height: 1,
      },
      style,
      zIndex,
      filler: pieces.topRight,
    });

    canvas.drawBox({
      rectangle: {
        column,
        row: row + height - 1,
        width: 1,
        height: 1,
      },
      style,
      zIndex,
      filler: pieces.bottomLeft,
    });

    canvas.drawBox({
      rectangle: {
        column: column + width - 1,
        row: row + height - 1,
        width: 1,
        height: 1,
      },
      style,
      zIndex,
      filler: pieces.bottomRight,
    });
  }
}
