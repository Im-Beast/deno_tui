import { keyword } from "./colors.ts";
import { Style } from "./colors.ts";
import { StyleCode } from "./colors.ts";
import { ConsoleSize, Dynamic, Writer } from "./types.ts";
import { getStaticValue, isFullWidth, removeStyleCodes } from "./util.ts";
import { capitalize } from "./util.ts";

const encoder = new TextEncoder();

export function moveCursor(
  row: number,
  column: number,
): string {
  return `\x1b[${row};${column}H`;
}

export function hideCursor(): string {
  return `\x1b[?25l`;
}

export function showCursor(): string {
  return `\x1b[?25h`;
}

export interface CanvasInstance {
  writer: Writer;
  styler: CanvasStyler;
  size: Dynamic<ConsoleSize>;
  filler: string;
  frameBuffer: [string, string][][];
  prevBuffer?: [string, string][][];
  smartRender: boolean;
  fps: number;
  lastTime: number;
  deltaTime: number;
}

export interface CreateCanvasOptions {
  writer: Writer;
  styler: CanvasStyler;
  size?: Dynamic<ConsoleSize>;
  filler?: string;
}

export function createCanvas(
  {
    writer,
    styler,
    filler = " ",
    size = () => Deno.consoleSize(writer.rid),
  }: CreateCanvasOptions,
): CanvasInstance {
  const canvas: CanvasInstance = {
    size,
    writer,
    styler,
    fps: 0,
    lastTime: Date.now(),
    deltaTime: 16,
    frameBuffer: [],
    smartRender: true,
    filler: styleTextFromStyler(filler, styler),
  };

  const updateCanvas = () => {
    fillBuffer(canvas);
    canvas.prevBuffer = undefined;
    renderFull(canvas);
  };

  updateCanvas();
  // Temporary fix for full-width characters getting cut
  setTimeout(updateCanvas, 32);

  Deno.addSignalListener("SIGWINCH", updateCanvas);
  Deno.addSignalListener("SIGINT", () => {
    Deno.writeSync(canvas.writer.rid, encoder.encode(showCursor()));
    Deno.exit(0);
  });

  return canvas;
}

export function fillBuffer(
  instance: CanvasInstance,
) {
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

export function renderChanges(instance: CanvasInstance): void {
  if (!instance.prevBuffer?.length) return;

  const { rows, columns } = getStaticValue(instance.size);

  let string = "";
  for (let r = 0; r < rows; ++r) {
    for (let c = 0; c < ~~(columns / 2); ++c) {
      if (
        String(instance.prevBuffer?.[r]?.[c]) !=
          String(instance.frameBuffer?.[r]?.[c])
      ) {
        string += moveCursor(r + 1, (c * 2) + 1) +
          instance.frameBuffer[r][c].join("");
      }
    }
  }
  Deno.writeSync(instance.writer.rid, encoder.encode(string));
}

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

export function render(instance: CanvasInstance): void {
  const start = Date.now();
  Deno.writeSync(instance.writer.rid, encoder.encode(hideCursor()));

  if (instance.smartRender && instance.prevBuffer) {
    renderChanges(instance);
  } else {
    renderFull(instance);
  }

  instance.prevBuffer = JSON.parse(JSON.stringify(instance.frameBuffer));

  instance.fps = 1000 / (Date.now() - instance.lastTime);
  instance.lastTime = Date.now();
  instance.deltaTime = Date.now() - start;
}

interface DrawPixelOptions {
  column: number;
  row: number;
  value: string;
  styler?: CanvasStyler;
}

export function drawPixel(
  instance: CanvasInstance,
  { column, row, styler, value }: DrawPixelOptions,
) {
  const index = column % 2;
  column = ~~(column / 2);
  const pos = instance.frameBuffer?.[row]?.[column];
  if (!pos) return;

  const fullWidth = isFullWidth(value);

  if (styler) {
    value = styleTextFromStyler(value, styler);
  }

  const revIndex = (index - 1) * -1;
  if (fullWidth) {
    if (index === 1) {
      instance.frameBuffer[row][column + 1][0] = "";
    } else {
      instance.frameBuffer[row][column][revIndex] = "";
    }
  }

  instance.frameBuffer[row][column][index] = value;
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
  { column, row, width, height, value = " ", styler }: DrawRectangleOptions,
) {
  for (let r = row; r < row + height; ++r) {
    for (let c = column; c < column + width; ++c) {
      drawPixel(instance, {
        column: c,
        row: r,
        value,
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

  for (const [l, line] of lines.entries()) {
    let offset = 0;
    for (let i = 0; i < line.length; ++i) {
      const char = line[i];

      drawPixel(instance, {
        column: options.column + i + offset,
        row: options.row + l,
        value: char,
        styler: options.styler,
      });

      if (isFullWidth(char)) offset += 1;
    }
  }
}

export interface CanvasStyler {
  foreground?: StyleCode;
  background?: StyleCode;
  attributes?: StyleCode[];
}

export interface AnyStyler {
  [key: string]: StyleCode | Style | {
    foreground?: StyleCode | Style;
    background?: StyleCode | Style;
    attributes?: (StyleCode | Style)[];
  };
}

export function styleText(
  text: string,
  style: StyleCode,
): string {
  return `${style}${text}\x1b[0m`;
}

export function compileStylerValue(value: string, index: string) {
  if (!value?.includes) throw value;
  return value.includes("\x1b") ? value : keyword(
    index.includes("background") && !value.includes("bg")
      ? `bg${capitalize(value)}` as Style
      : value as Style,
  );
}

export function compileStyler<T = void>(
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

export function styleTextFromStyler(
  text: string,
  styler: CanvasStyler,
): string {
  if (styler.foreground) {
    text = styleText(text, styler.foreground);
  }
  if (styler.background) {
    text = styleText(text, styler.background);
  }

  if (styler.attributes) {
    for (const attribute of styler.attributes) {
      text = styleText(text, attribute);
    }
  }

  return text;
}
