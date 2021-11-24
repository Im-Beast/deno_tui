import { keyword } from "./colors.ts";
import { Style } from "./colors.ts";
import { StyleCode } from "./colors.ts";
import { ConsoleSize, Dynamic, Writer } from "./types.ts";
import { getStaticValue, isFullWidth, removeStyleCodes } from "./util.ts";
import { capitalize } from "./util.ts";

const textEncoder = new TextEncoder();

export function moveCursor(
  writer: Writer,
  row: number,
  column: number,
) {
  Deno.writeSync(writer.rid, textEncoder.encode(`\x1b[${row};${column}H`));
}

export function hideCursor(writer: Writer) {
  Deno.writeSync(writer.rid, textEncoder.encode(`\x1b[?25l`));
}

export function showCursor(writer: Writer) {
  Deno.writeSync(writer.rid, textEncoder.encode(`\x1b[?25h`));
}

export interface CreateCanvasOptions {
  writer: Writer;
  styler: CanvasStyler;
  size?: Dynamic<ConsoleSize>;
  filler?: string;
}

export interface CanvasInstance {
  writer: Writer;
  styler: CanvasStyler;
  size: Dynamic<ConsoleSize>;
  filler: string;
  frameBuffer: [string, string][][];
  prevBuffer?: [string, string][][];
  changes: [number, number][];
  smartRender: boolean;
  fps: number;
  lastTime?: number;
}

export function createCanvas(
  {
    writer,
    styler,
    size = () => Deno.consoleSize(writer.rid),
    filler = " ",
  }: CreateCanvasOptions,
): CanvasInstance {
  const canvas: CanvasInstance = {
    writer,
    styler,
    size,
    filler: styleTextFromStyler(filler, styler),
    frameBuffer: [],
    changes: [],
    smartRender: true,
    fps: 0,
  };

  const updateCanvas = () => {
    Deno.writeSync(writer.rid, textEncoder.encode(`\x1b[0332J`));
    fillBuffer(canvas);
    renderFull(canvas);
    canvas.prevBuffer = undefined;
  };

  updateCanvas();

  Deno.addSignalListener("SIGWINCH", updateCanvas);
  Deno.addSignalListener("SIGINT", () => {
    showCursor(writer);
    Deno.exit(0);
  });

  return canvas;
}

export function fillBuffer(
  instance: CanvasInstance,
) {
  const fillerArr: [string, string] =
    isFullWidth(removeStyleCodes(instance.filler))
      ? [instance.filler, ""]
      : [instance.filler, instance.filler];

  const { rows, columns } = getStaticValue(instance.size);

  for (let r = 0; r < rows; ++r) {
    instance.frameBuffer[r] ||= [];
    for (let c = 0; c < ~~(columns / 2); ++c) {
      if (!instance.frameBuffer[r][c]?.length) {
        instance.frameBuffer[r][c] = fillerArr;
        instance.changes.push([r, c]);
      }
    }
  }
}

export function renderChanges(instance: CanvasInstance): void {
  for (const [r, c] of instance.changes) {
    instance.frameBuffer[r][c] ||= [instance.filler, instance.filler];
    const text = instance.frameBuffer[r][c].join("");

    moveCursor(instance.writer, r + 1, (c * 2) + 1);
    const encoded = textEncoder.encode(text);
    Deno.writeSync(instance.writer.rid, encoded);
  }

  instance.changes = [];
}

export function renderFull(instance: CanvasInstance): void {
  const { rows, columns } = getStaticValue(instance.size);

  for (let r = 0; r < rows; ++r) {
    let string = "\r";

    for (let c = 0; c < ~~(columns / 2); ++c) {
      string += instance.frameBuffer[r][c].join("");
    }

    if (r < rows - 1) string += "\n";

    Deno.writeSync(instance.writer.rid, textEncoder.encode(string));
  }
}

export function render(instance: CanvasInstance): void {
  if (instance.prevBuffer?.length) {
    const { rows, columns } = getStaticValue(instance.size);

    for (const [r, _row] of instance.frameBuffer.entries()) {
      if (!_row || r > rows) continue;
      for (const [c, _col] of _row.entries()) {
        if (!_col || c >= ~~(columns / 2)) continue;
        // @ts-expect-error javascript hack
        if (String(instance.prevBuffer?.[r]?.[c]) != _col) {
          instance.changes.push([r, c]);
        }
      }
    }
  }

  moveCursor(instance.writer, 0, 0);
  hideCursor(instance.writer);

  if (instance.smartRender && instance.prevBuffer) {
    renderChanges(instance);
  } else {
    renderFull(instance);
  }

  instance.prevBuffer = JSON.parse(JSON.stringify(instance.frameBuffer));

  if (!instance.lastTime) {
    instance.lastTime = Date.now();
  } else {
    const fps = 1000 / (Date.now() - instance.lastTime);
    instance.fps = fps;
    instance.lastTime = Date.now();
  }
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
  if (Math.min(row, column) < 0) return;
  const index = column % 2;
  column = ~~(column / 2);

  if (!instance.frameBuffer?.[row]?.[column]?.length) {
    instance.frameBuffer[row] ||= [];
    instance.frameBuffer[row][column] ||= [
      instance.filler,
      instance.filler,
    ];
  }

  const fullWidth = isFullWidth(removeStyleCodes(value));

  if (styler) {
    value = styleTextFromStyler(value, styler);
  }

  const pos = instance.frameBuffer[row][column];
  const valueArr: [string, string] = [value, value];

  const revIndex = (index - 1) * -1;
  if (fullWidth) {
    if (index === 1) {
      instance.frameBuffer[row][column + 1][0] = "";
      valueArr[revIndex] = pos[revIndex];
    } else {
      valueArr[revIndex] = "";
    }
  } else {
    valueArr[revIndex] = fullWidth ? "" : pos[revIndex];
  }

  instance.frameBuffer[row][column] = valueArr;
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
    index.includes("background")
      ? `bg${capitalize(value)}` as Style
      : value as Style,
  );
}

export function compileStyler<T = void>(
  styler: T extends CanvasStyler ? T | AnyStyler : AnyStyler,
): T extends CanvasStyler ? T : AnyStyler {
  // @ts-ignore :(
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
