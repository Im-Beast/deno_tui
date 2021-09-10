import { Writer } from "./types.ts";

export interface FrameBuffer {
  [row: number]: {
    [column: number]: string;
  };
}

export interface FrameBufferInstance {
  writer: Writer;
  buffer: FrameBuffer;
  columns: number;
  rows: number;
  filler: string;
}

const textEncoder = new TextEncoder();

const chars = {
  showCursor: textEncoder.encode("\x1b[?25l"),
  hideCursor: textEncoder.encode("\x1b[?25l"),
};

export async function watchFrameBuffer(instance: FrameBufferInstance) {
  for await (const _ of Deno.signals.windowChange()) {
    const { columns, rows } = Deno.consoleSize(instance.writer.rid);
    instance.columns = columns;
    instance.rows = rows;
    fillBuffer(instance, instance.filler);
  }
}

export function writeSync(
  writer: Writer,
  value: string | Uint8Array,
) {
  if (typeof value === "string") value = textEncoder.encode(value);

  let writtenBytes = 0;
  while (writtenBytes < value.length) {
    writtenBytes += Deno.writeSync(writer.rid, value.subarray(writtenBytes));
  }
}

export async function write(
  writer: Writer,
  value: string | Uint8Array,
) {
  if (typeof value === "string") value = textEncoder.encode(value);

  let writtenBytes = 0;
  while (writtenBytes < value.length) {
    writtenBytes += await Deno.write(writer.rid, value.subarray(writtenBytes));
  }
}

export function writeBufferSync(instance: FrameBufferInstance) {
  hideCursor(instance.writer);
  moveCursor(instance.writer, 0, 0);

  let string = "";

  for (let r = 0; r < instance.rows; ++r) {
    string += "\r";
    for (let c = 0; c < instance.columns; ++c) {
      string += instance.buffer[r][c];
    }
    if (r < instance.rows - 1) string += "\n";
    Deno.writeSync(instance.writer.rid, textEncoder.encode(string));
    string = "";
  }
}

export async function writeBuffer(instance: FrameBufferInstance) {
  const promises = [];

  hideCursor(instance.writer);
  moveCursor(instance.writer, 0, 0);

  let string = "";

  for (let r = 0; r < instance.rows; ++r) {
    string += "\r";
    for (let c = 0; c < instance.columns; ++c) {
      string += instance.buffer[r][c];
    }
    string += "\n";
    promises.push(instance.writer.write(textEncoder.encode(string)));
    string = "";
  }

  await Promise.all(promises);
}

export function moveCursor(
  writer: Writer,
  column: number,
  row: number,
) {
  const ansi = textEncoder.encode(`\x1b[${column};${row}H`);
  writeSync(writer, ansi);
}

export function hideCursor(writer: Writer) {
  writeSync(writer, chars.hideCursor);
}

export function showCursor(writer: Writer) {
  writeSync(writer, chars.showCursor);
}

export function fillBuffer(
  instance: FrameBufferInstance,
  value: string = instance.filler,
) {
  const buffer = instance.buffer;
  for (let r = 0; r < instance.rows; ++r) {
    buffer[r] ||= [];
    for (let c = 0; c < instance.columns; ++c) {
      buffer[r][c] ||= value;
    }
  }
}

export function createFrameBuffer(writer: Writer): FrameBufferInstance {
  const { columns, rows } = Deno.consoleSize(writer.rid);

  const buffer: FrameBuffer = [];

  const frameBuffer: FrameBufferInstance = {
    buffer,
    writer,
    columns,
    rows,
    filler: " ",
  };

  watchFrameBuffer(frameBuffer);

  return frameBuffer;
}
