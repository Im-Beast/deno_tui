import crayon from "https://deno.land/x/crayon@2.3.1/mod.ts";

import {
  Attribute,
  CrayonStyle,
  ForegroundFourBitColor,
} from "https://deno.land/x/crayon@2.3.1/types.ts";

import {
  createFrameBuffer,
  fillBuffer,
  FrameBufferInstance,
  writeBufferSync,
} from "./frame_buffer.ts";

import { Writer } from "./types.ts";

export interface CanvasInstance {
  writer: Writer;
  frameBuffer: FrameBufferInstance;
  styler: CanvasStyler;
}

export interface CanvasStyler {
  foreground?: CanvasStyle;
  background?: CanvasStyle;
  attributes?: Attribute[];
}

export type CanvasStyle =
  | `#${string}`
  | `rgb(${number}, ${number}, ${number})`
  | `rgb(${number},${number},${number})`
  | ForegroundFourBitColor
  | Attribute;

const rgbRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/;

export function getStyle(
  style: CanvasStyle,
  bg: boolean,
) {
  if (style.startsWith("#")) {
    return crayon()[bg ? "bgHex" : "hex"](style, true);
  } else if (rgbRegex.test(style)) {
    const [, r, g, b] = style.match(rgbRegex)?.map(Number) || [];
    return crayon()[bg ? "bgRgb" : "rgb"](r, g, b);
  }

  return bg
    ? crayon()[`bg${style[0].toUpperCase()}${style.slice(1)}` as CrayonStyle]
    : crayon()[style as CrayonStyle];
}

export function styleText(
  style: CanvasStyle | Attribute,
  background: boolean,
  text: string,
): string {
  return getStyle(style, background)(text);
}

export function styleTextFromStyler(
  styler: CanvasStyler,
  text: string,
): string {
  if (styler.foreground) {
    text = styleText(styler.foreground, false, text);
  }
  if (styler.background) {
    text = styleText(styler.background, true, text);
  }

  if (styler.attributes) {
    for (const attribute of styler.attributes) {
      text = styleText(attribute, false, text);
    }
  }

  return text;
}

export function draw(instance: CanvasInstance) {
  writeBufferSync(instance.frameBuffer);
}

export function createCanvas(
  writer: Writer,
  styler: CanvasStyler,
): CanvasInstance {
  const frameBuffer = createFrameBuffer(writer);

  frameBuffer.filler = styleTextFromStyler(styler, " ");
  fillBuffer(frameBuffer);

  const canvas: CanvasInstance = {
    frameBuffer,
    writer,
    styler,
  };

  Deno.addSignalListener("SIGWINCH", () => draw(canvas));

  return canvas;
}

export function loop(
  instance: CanvasInstance,
  interval: number,
  middleware?: () => void,
): () => void {
  const loopInterval = setInterval(() => {
    if (middleware) middleware();
    writeBufferSync(instance.frameBuffer);
  }, interval);

  return () => {
    clearInterval(loopInterval);
  };
}

export interface DrawPixelOptions {
  styler?: CanvasStyler;
  column: number;
  value: string;
  row: number;
}

export function drawPixel(
  instance: CanvasInstance,
  { row, column, styler, value }: DrawPixelOptions,
) {
  if (instance.frameBuffer?.buffer[row]?.[column]) {
    instance.frameBuffer.buffer[row][column] = styleTextFromStyler(
      styler || instance.styler,
      value,
    );
  }
}

export interface DrawRectangleOptions {
  styler?: CanvasStyler;
  row: number;
  column: number;
  width: number;
  height: number;
  value?: string;
}

export function drawRectangle(
  instance: CanvasInstance,
  { column, row, width, height, value, styler }: DrawRectangleOptions,
) {
  for (let r = row; r < row + height; ++r) {
    for (let c = column; c < column + width; ++c) {
      drawPixel(instance, {
        column: c,
        row: r,
        value: value || " ",
        styler,
      });
    }
  }
}

export interface DrawTextOptions {
  styler?: CanvasStyler;
  column: number;
  text: string;
  row: number;
}

export function drawText(
  instance: CanvasInstance,
  options: DrawTextOptions,
) {
  const lines = options.text.split("\n");

  for (let l = 0; l < lines.length; ++l) {
    for (let i = 0, line = lines[l]; i < line.length; ++i) {
      const letter = line[i];
      drawPixel(instance, {
        column: options.column + i,
        row: options.row + l,
        value: letter,
        styler: options.styler,
      });
    }
  }
}
