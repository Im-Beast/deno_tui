// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { Attribute, Color, keyword, Style, StyleCode } from "./colors.ts";
import { ConsoleSize, Dynamic, Writer } from "./types.ts";
import {
  capitalize,
  getStaticValue,
  isFullWidth,
  removeStyleCodes,
} from "./util.ts";

const encoder = new TextEncoder();

/** ASCII escape code to hide terminal cursor  */
export const HIDE_CURSOR = `\x1b[?25l`;
/** ASCII escape code to show terminal cursor  */
export const SHOW_CURSOR = `\x1b[?25h`;

/**
 * Get ASCII escape code that moves terminal cursor to given position
 * @param row - terminal row tow which cursor will be moved
 * @param column - terminal column tow which cursor will be moved
 */
export function moveCursor(
  row: number,
  column: number,
): string {
  return `\x1b[${row};${column}H`;
}

/** Canvas is object which manages high-level "painting" on the terminal */
export interface CanvasInstance {
  /** Writer that canvas will write data to */
  writer: Writer;
  /** Size of canvas, limits size of frameBuffer too */
  size: Dynamic<ConsoleSize>;
  /** Character which will be used to fill empty space */
  filler: string;
  /** Matrix which stores pixels which later will be used to render to the terminal */
  frameBuffer: [string, string][][];
  /** Map of previously used frameBuffer, used to calculate changes */
  prevBuffer: Map<string, string>;
  /** Whether canvas should only redraw changes */
  smartRender: boolean;
  /** Canvas FPS */
  fps: number;
  /** Last time canvas was rendered */
  lastTime: number;
  /** How long it took to render last frame */
  deltaTime: number;
  /** Fix for smartRender cutting off fullWidth characters */
  refreshed: boolean;
}

export interface CreateCanvasOptions {
  /** Writer that canvas will write data to */
  writer: Writer;
  /** Size of canvas, limits size of frameBuffer too */
  size?: Dynamic<ConsoleSize>;
  /** Character which will be used to fill empty space */
  filler: string;
  /** Whether canvas should only redraw changes, defaults to true */
  smartRender?: boolean;
}

/**
 * Create CanvasInstance
 * It is used to render on terminal screen
 * @param options
 * @example
 * ```ts
 * createCanvas({
 *  writer: Deno.stdout,
 *  filler: "\x1b[32m \x1b[0m",
 *  //size: {
 *  // columns: 10,
 *  // rows: 10,
 *  //},
 *  //smartRender: false
 * });
 * ```
 */
export function createCanvas(
  {
    writer,
    filler,
    size = () => Deno.consoleSize(writer.rid),
    smartRender = true,
  }: CreateCanvasOptions,
): CanvasInstance {
  const canvas: CanvasInstance = {
    size,
    filler,
    writer,
    smartRender,
    fps: 0,
    lastTime: Date.now(),
    deltaTime: 16,
    frameBuffer: [],
    prevBuffer: new Map(),
    refreshed: false,
  };

  const updateCanvas = (render = true) => {
    fillBuffer(canvas);
    if (render) {
      renderFull(canvas);
    }
  };

  updateCanvas(false);

  addEventListener("unload", () => {
    Deno.writeSync(canvas.writer.rid, encoder.encode(SHOW_CURSOR));
  });

  Deno.addSignalListener("SIGWINCH", () => updateCanvas(true));

  return canvas;
}

/**
 * Fills empty spaces in canvas frameBuffer
 * @param instance - canvas instance which frameBuffer will be filled
 */
export function fillBuffer(instance: CanvasInstance): void {
  const fullWidth = isFullWidth(removeStyleCodes(instance.filler));

  const { rows, columns } = getStaticValue(instance.size);

  for (let r = 0; r < rows; ++r) {
    instance.frameBuffer[r] ||= [];
    for (let c = 0; c < ~~(columns / 2); ++c) {
      instance.frameBuffer[r][c] ||= [
        instance.filler,
        fullWidth ? "" : instance.filler,
      ];
    }
  }
}

/**
 * Compares changes between frames and then renders only them on terminal screen
 * @param instance - canvas instance which will be rendered
 */
export function renderChanges(instance: CanvasInstance): void {
  const { rows, columns } = getStaticValue(instance.size);

  let string = "";
  for (let r = 0; r < rows; ++r) {
    for (let c = 0; c < ~~(columns / 2); ++c) {
      const value = instance.frameBuffer?.[r]?.[c];
      if (
        instance.prevBuffer.get(`${r}/${c}`) !=
          String(value)
      ) {
        instance.prevBuffer.set(`${r}/${c}`, String(value));

        string += moveCursor(r + 1, (c * 2) + 1) +
          value.join("");
      }
    }
  }

  Deno.writeSync(instance.writer.rid, encoder.encode(string));
}

/**
 * Renders canvas frameBuffer on terminal screen
 * @param instance - canvas instance which will be rendered
 */
export function renderFull(instance: CanvasInstance): void {
  const { rows, columns } = getStaticValue(instance.size);

  Deno.writeSync(instance.writer.rid, encoder.encode(moveCursor(0, 0)));

  for (let r = 0; r < rows; ++r) {
    let string = `\r`;
    for (let c = 0; c < ~~(columns / 2); ++c) {
      string += instance.frameBuffer[r][c].join("");
    }
    if (r < rows - 1) string += "\n";
    Deno.writeSync(instance.writer.rid, encoder.encode(string));
  }
}

/**
 * Render terminal depending to its options
 *
 * Calculate running metrics (fps/lastTime/deltaTime)
 * @param instance - canvas instance which will be rendered
 */
export function render(instance: CanvasInstance): void {
  const start = Date.now();
  Deno.writeSync(instance.writer.rid, encoder.encode(HIDE_CURSOR));

  if (instance.smartRender) {
    renderChanges(instance);

    /** Fix for full-width characters */
    if (!instance.refreshed && instance.fps > 0) {
      fillBuffer(instance);
      renderFull(instance);
      instance.refreshed = true;
    }
  } else {
    renderFull(instance);
  }

  instance.fps = 1000 / (Date.now() - instance.lastTime);
  instance.lastTime = Date.now();
  instance.deltaTime = Date.now() - start;
}

interface DrawPixelOptions {
  /** Column on which pixel will be drawn */
  column: number;
  /** Row on which pixel will be drawn */
  row: number;
  /** String that will be set as pixel */
  value: string;
  /** Definition on how pixel will look like */
  styler?: CanvasStyler;
}

/**
 * Draw pixel on canvas
 * @param canvas - canvas instance on which pixel will be drawn
 * @param options
 * @example
 * ```ts
 * const canvas = createCanvas(...);
 * ...
 * drawPixel(canvas, {
 *  column: 3,
 *  row: 3,
 *  value: "o",
 *  styler: {
 *    foreground: "\x1b[32m",
 *  },
 * });
 * ```
 */
export function drawPixel(
  canvas: CanvasInstance,
  { column, row, styler, value }: DrawPixelOptions,
): void {
  const index = column % 2;
  column = ~~(column / 2);
  const pos = canvas.frameBuffer?.[row]?.[column];
  if (!pos) return;

  const fullWidth = isFullWidth(value);

  if (styler) {
    value = styleStringFromStyler(value, styler);
  }

  const revIndex = (index - 1) * -1;
  if (fullWidth) {
    if (index === 1) {
      canvas.frameBuffer[row][column + 1][0] = "";
    } else {
      canvas.frameBuffer[row][column][revIndex] = "";
    }
  }

  canvas.frameBuffer[row][column][index] = value;
}

export interface DrawRectangleOptions {
  /** Column on which rectangle will be drawn */
  column: number;
  /** Row on which rectangle will be drawn */
  row: number;
  /** Width of rectangle */
  width: number;
  /** Height of rectangle */
  height: number;
  /** String that will be set as pixel */
  value?: string;
  /** Definition on how pixel will look like */
  styler?: CanvasStyler;
}

/**
 * Draw rectangle on canvas
 * @param canvas - canvas instance on which rectangle will be drawn
 * @param options
 * @example
 * ```ts
 * const canvas = createCanvas(...);
 * ...
 * drawRectangle(canvas, {
 *  column: 3,
 *  row: 3,
 *  width: 5,
 *  height: 5,
 *  value: "=",
 *  styler: {
 *    foreground: "\x1b[32m",
 *  },
 * });
 * ```
 */
export function drawRectangle(
  canvas: CanvasInstance,
  { column, row, width, height, value = " ", styler }: DrawRectangleOptions,
): void {
  for (let r = row; r < row + height; ++r) {
    for (let c = column; c < column + width; ++c) {
      drawPixel(canvas, {
        column: c,
        row: r,
        value,
        styler,
      });
    }
  }
}

export interface DrawTextOptions {
  /** Terminal's column on which text drawing will start */
  column: number;
  /** Terminal's row on which text drawing will start */
  row: number;
  /** String that will be drawn */
  text: string;
  /** Definition on how drawn text will look like */
  styler?: CanvasStyler;
}

/**
 * Draw text on canvas
 * @param canvas - canvas instance on which text will be drawn
 * @param options
 * @example
 * ```ts
 * const canvas = createCanvas(...);
 * ...
 * drawText(canvas, {
 *  column: 3,
 *  row: 3,
 *  text: "Hello world",
 *  styler: {
 *    foreground: "\x1b[32m",
 *  },
 * });
 * ```
 */
export function drawText(
  canvas: CanvasInstance,
  { column, row, text, styler }: DrawTextOptions,
): void {
  const lines = text.split("\n");

  for (const [l, line] of lines.entries()) {
    let offset = 0;
    for (let i = 0; i < line.length; ++i) {
      const char = line[i];

      drawPixel(canvas, {
        column: column + i + offset,
        row: row + l,
        value: char,
        styler: styler,
      });

      if (isFullWidth(char)) offset += 1;
    }
  }
}

/**
 * Used to define looks of elements drawn on canvas
 */
export interface CanvasStyler {
  /** ANSI escape code sequence specifying foreground color of characters that ill be drawn */
  foreground?: StyleCode;
  /** ANSI escape code sequence specifying background color of characters that will be drawn */
  background?: StyleCode;
  /** ANSI escape code sequence specifying attributes of characters that will be drawn */
  attributes?: StyleCode[];
}

/** Any possible styler */
export type AnyStyler = {
  [key: string]: StyleCode | Style | (StyleCode | Attribute)[] | {
    foreground?: StyleCode | Color;
    background?: StyleCode | Color;
    attributes?: (StyleCode | Attribute)[];
  };
} & {
  foreground?: StyleCode | Color;
  background?: StyleCode | Color;
  attributes?: (StyleCode | Attribute)[];
};

/**
 * Returns text with applied ANSI escape code
 * @param text - text that will be styled
 * @param style - ANSI escape code that will be applied to the text
 * @example
 * ```ts
 * styleText("Hi", "\x1b[32m"); // -> "\x1b[32mHi\x1b[0m"
 * ```
 */
export function styleText(
  text: string,
  style: StyleCode,
): string {
  return `${style}${text}\x1b[0m`;
}

/**
 * Compiles value found in styler to StyleCode
 * @param value - value that needs to be compiled
 * @param property - styler property name on which value is located
 * @examples
 * ```ts
 * compileStylerValue("red", "background"); // -> "\x1b[41m"
 * ```
 */
export function compileStylerValue(value: string, property: string): StyleCode {
  if (!value?.includes) throw value;
  return value.includes("\x1b") ? value as StyleCode : keyword(
    property.includes("background") && !value.includes("bg")
      ? `bg${capitalize(value)}` as Style
      : value as Style,
  );
}

/**
 * Compiles every parameter of a styler to ANSI escape code.
 * @param styler - styler that will be compiled
 * @example
 * ```ts
 * compileStyler({
 *  foreground: "red", // -> "\x1b[31m"
 *  background: "blue", // -> "\x1b[44m"
 *  foo: "magenta" // -> "\x1b[35m"
 * });
 * ```
 */
export function compileStyler<T>(
  styler: T extends CanvasStyler ? T | AnyStyler : AnyStyler,
): T extends CanvasStyler ? T : AnyStyler {
  // @ts-expect-error Creating new object which will be expanded
  const obj: T extends CanvasStyler ? T : AnyStyler = {};

  for (const [index, value] of Object.entries(styler)) {
    if (typeof value === "number") continue;

    if (Array.isArray(value)) {
      Reflect.set(obj, index, value.map((v) => compileStylerValue(v, index)));
    } else if (typeof value === "object") {
      Reflect.set(obj, index, compileStyler(value));
    } else {
      Reflect.set(
        obj,
        index,
        compileStylerValue(value, index),
      );
    }
  }

  return obj;
}

/**
 * Applies ansi escape codesfrom styler to given string
 * @param string - string to be styled
 * @param styler - definition for styling string
 * @example
 * styleStringFromStyler("Hello", {
 *   foreground: "\x1b[32m",
 *   background: "\x1b[44m",
 * }); // -> "\x1b[32m\x1b[44mHello\x1b[0m"
 */
export function styleStringFromStyler(
  string: string,
  styler: CanvasStyler,
): string {
  let style = "";
  if (styler.foreground) {
    style += styler.foreground;
  }
  if (styler.background) {
    style += styler.background;
  }

  if (styler.attributes) {
    for (const attribute of styler.attributes) {
      style += attribute;
    }
  }

  return styleText(string, style as StyleCode);
}
