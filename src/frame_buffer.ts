import { ConsoleSize, Dynamic, Writer } from "./types.ts";
import { getStaticValue } from "./util.ts";

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

export interface CreateFrameBufferOptions {
  writer: Writer;
  filler?: string;
  size?: Dynamic<ConsoleSize>;
}

export function createFrameBuffer(
  {
    writer,
    filler = " ",
    size = () => Deno.consoleSize(writer.rid),
  }: CreateFrameBufferOptions,
): FrameBufferInstance {
  const frameBuffer: FrameBufferInstance = {
    ...getStaticValue(size),
    buffer: [],
    writer,
    filler,
  };

  if (typeof size === "function") {
    Deno.addSignalListener("SIGWINCH", () => {
      const { columns, rows } = size();
      frameBuffer.columns = columns;
      frameBuffer.rows = rows;
      fillBuffer(frameBuffer, frameBuffer.filler);
    });
  }

  Deno.addSignalListener("SIGINT", () => {
    showCursor(writer);
    Deno.exit(0);
  });

  return frameBuffer;
}

const textEncoder = new TextEncoder();

export function write(
  writer: Writer,
  value: string | Uint8Array,
) {
  if (typeof value === "string") value = textEncoder.encode(value);

  let writtenBytes = 0;
  while (writtenBytes < value.length) {
    writtenBytes += Deno.writeSync(writer.rid, value.subarray(writtenBytes));
  }
}

export function moveCursor(
  writer: Writer,
  column: number,
  row: number,
) {
  const ansi = textEncoder.encode(`\x1b[${column};${row}H`);
  write(writer, ansi);
}

export function hideCursor(writer: Writer) {
  write(writer, "\x1b[?25l");
}

export function showCursor(writer: Writer) {
  write(writer, "\x1b[?25h");
}

export function writeBuffer(instance: FrameBufferInstance) {
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
