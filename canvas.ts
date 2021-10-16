import crayon from "https://deno.land/x/crayon@2.3.1/mod.ts";

import {
  Attribute,
  Crayon,
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

export type CanvasInstance = {
  writer: Writer;
  frameBuffer: FrameBufferInstance;
  styler: CanvasStyler;
};

export type CanvasStyler<T = void> = {
  foreground: CanvasStyle<T>;
  background: CanvasStyle<T>;
  attributes?: Attribute[];
};

export type CanvasStyle<E = void> =
  | `#${string}`
  | `rgb(${number}, ${number}, ${number})`
  | `rgb(${number},${number},${number})`
  | ForegroundFourBitColor
  | Attribute
  | (E extends string ? E : ForegroundFourBitColor);

const rgbRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/;

export function getStyle<S = void, F = void, O = void>(
  style: CanvasStyle,
  background: boolean,
): Crayon<S, F, O> {
  if (typeof style !== "string") {
    throw crayon
      `{blue style} property is supposed to be string! Got {bold.red ${typeof style}} instead`;
  }

  if (style[0] === "#") {
    return crayon()[background ? "bgHex" : "hex"](
      style,
      true,
    ) as unknown as Crayon<
      S,
      F,
      O
    >;
  } else if (rgbRegex.test(style)) {
    const [, r, g, b] = style.match(rgbRegex) || [];
    return crayon()[background ? "bgRgb" : "rgb"](
      Number(r),
      Number(g),
      Number(b),
    ) as unknown as Crayon<S, F, O>;
  }

  const bgStyle = `bg${style[0].toUpperCase()}${style.slice(1)}`;
  return crayon()[
    (background ? bgStyle : style) as CrayonStyle
  ] as unknown as Crayon<
    S,
    F,
    O
  >;
}

export function styleTextFromStyler(
  styler: CanvasStyler,
  text: string,
): string {
  text = styleText(styler.foreground, false, text);
  text = styleText(styler.background, true, text);

  if (styler.attributes) {
    styler.attributes.forEach((attribute) => {
      text = styleText(attribute, true, text);
    });
  }

  return text;
}

export function styleText(
  style: CanvasStyle | Attribute,
  background: boolean,
  text: string,
): string {
  const stylerrr = getStyle(style, background);
  if (typeof stylerrr !== "function") {
    throw `${stylerrr} ${style} ${background}`;
  }
  return getStyle(style, background)(text);
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

export type DrawPixelOptions = {
  styler?: CanvasStyler;
  column: number;
  value: string;
  row: number;
};

export function drawPixel(
  instance: CanvasInstance,
  options: DrawPixelOptions,
) {
  if (instance.frameBuffer?.buffer[options.row]?.[options.column]) {
    instance.frameBuffer.buffer[options.row][options.column] =
      styleTextFromStyler(
        options.styler || instance.styler,
        options.value,
      );
  }
}

export type DrawTextOptions = {
  styler?: CanvasStyler;
  column: number;
  text: string;
  row: number;
};

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
