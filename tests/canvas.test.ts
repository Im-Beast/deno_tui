// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  CanvasStyler,
  compileStyler,
  compileStylerValue,
  createCanvas,
  drawPixel,
  drawRectangle,
  drawText,
  moveCursor,
  styleStringFromStyler,
  styleText,
} from "../src/canvas.ts";
import { getStaticValue } from "../src/util.ts";
import { assertEquals, assertThrows } from "./deps.ts";

const decoder = new TextDecoder();

const writer = Deno.stdout;

export const canvas = createCanvas({
  filler: " ",
  writer: Deno.stdout,
  size: {
    rows: 30,
    columns: 30,
  },
});

let consoleSize = {
  columns: 5,
  rows: 5,
};

try {
  consoleSize = await Deno.consoleSize(writer.rid);
} catch { /**/ }

const _canvas = createCanvas({
  filler: " ",
  writer,
  size: consoleSize,
});

console.clear();

Deno.test("Canvas: styler", () => {
  assertEquals(
    compileStylerValue("black", "foreground"),
    "\x1b[30m",
  );
  assertEquals(
    compileStylerValue("black", "frame"),
    "\x1b[30m",
  );
  assertEquals(
    compileStylerValue("black", "background"),
    "\x1b[40m",
  );
  assertEquals(
    compileStylerValue("bgBlack", "background"),
    "\x1b[40m",
  );

  const styler = compileStyler<CanvasStyler>({
    foreground: "blue",
    background: "red",
    attributes: ["bold"],
  });

  assertEquals(styler, {
    foreground: "\x1b[34m",
    background: "\x1b[41m",
    attributes: ["\x1b[1m"],
  });

  const text = "Hello world";
  const styledText = styleStringFromStyler(text, styler);

  assertEquals(styledText, `\x1b[34m\x1b[41m\x1b[1m${text}\x1b[0m`);
});

Deno.test("Canvas: frameBuffer size", () => {
  assertEquals(_canvas.frameBuffer.length, consoleSize.rows);
  assertEquals(_canvas.frameBuffer[0].length, ~~(consoleSize.columns / 2));

  const size = getStaticValue(canvas.size);
  assertEquals(canvas.frameBuffer.length, size.rows);
  assertEquals(canvas.frameBuffer[0].length, ~~(size.columns / 2));
});

Deno.test("Canvas: drawing pixel", () => {
  for (const value of ["B", "Ｂ", "--", ""]) {
    const column = 4;
    const row = 3;

    const draw = () =>
      drawPixel(canvas, {
        column,
        row,
        value,
      });

    if (value.length !== 1) {
      assertThrows(draw);
      continue;
    }

    draw();

    assertEquals(canvas.frameBuffer[row][~~(column / 2)][column % 2], value);
  }
});

Deno.test("Canvas: drawing rectangle", () => {
  for (const value of ["B", "Ｂ", "--", ""]) {
    const column = 3;
    const row = 1;

    const draw = () =>
      drawRectangle(canvas, {
        column,
        row,
        width: 4,
        height: 4,
        value,
      });

    if (value.length !== 1) {
      assertThrows(draw);
      continue;
    }

    draw();
    for (let r = 0; r < 4; ++r) {
      for (let c = 0; c < 4; ++c) {
        assertEquals(
          canvas.frameBuffer[row + r][~~((column + c) / 2)][(column + c) % 2],
          value,
          `Failed drawing rectangle at offset ${r}/${c}`,
        );
      }
    }
  }
});

Deno.test("Canvas: draw text", () => {
  const column = 5;
  const row = 8;

  drawText(canvas, {
    column,
    row,
    text: "Ｂb\nB",
  });

  assertEquals(canvas.frameBuffer[row][2][1], "Ｂ");
  assertEquals(canvas.frameBuffer[row][3][0], "");
  assertEquals(canvas.frameBuffer[row][3][1], "b");
  assertEquals(canvas.frameBuffer[row + 1][2][1], "B");
});

Deno.test("Canvas: styleText", () => {
  assertEquals(
    styleText("Hello world", "\x1b[32m"),
    "\x1b[32mHello world\x1b[0m",
  );
});

Deno.test("Canvas: moveCursor", () => {
  assertEquals(moveCursor(4, 7), "\x1b[4;7H");
});

Deno.test("Canvas: rendering", async () => {
  const outputs = {
    full:
      "[0;0H\r                              \n\r Hello world                  \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r      -                       \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                     ======== \n\r                     ======== \n\r                     ======== \n\r                     ======== \n\r                     ======== \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \n\r                              \x1b[?25h",
    emptyChanges: "\x1b[?25h",
    changes:
      "[1;1H  [1;3H  [1;5H  [1;7H  [1;9H  [1;11H  [1;13H  [1;15H  [1;17H  [1;19H  [1;21H  [1;23H  [1;25H  [1;27H  [1;29H  [2;1H H[2;3Hel[2;5Hlo[2;7H w[2;9Hor[2;11Hld[2;13H  [2;15H  [2;17H  [2;19H  [2;21H  [2;23H  [2;25H  [2;27H  [2;29H  [3;1H  [3;3H  [3;5H  [3;7H  [3;9H  [3;11H  [3;13H  [3;15H  [3;17H  [3;19H  [3;21H  [3;23H  [3;25H  [3;27H  [3;29H  [4;1H  [4;3H  [4;5H  [4;7H  [4;9H  [4;11H  [4;13H  [4;15H  [4;17H  [4;19H  [4;21H  [4;23H  [4;25H  [4;27H  [4;29H  [5;1H  [5;3H  [5;5H  [5;7H  [5;9H  [5;11H  [5;13H  [5;15H  [5;17H  [5;19H  [5;21H  [5;23H  [5;25H  [5;27H  [5;29H  [6;1H  [6;3H  [6;5H  [6;7H  [6;9H  [6;11H  [6;13H  [6;15H  [6;17H  [6;19H  [6;21H  [6;23H  [6;25H  [6;27H  [6;29H  [7;1H  [7;3H  [7;5H  [7;7H  [7;9H  [7;11H  [7;13H  [7;15H  [7;17H  [7;19H  [7;21H  [7;23H  [7;25H  [7;27H  [7;29H  [8;1H  [8;3H  [8;5H  [8;7H- [8;9H  [8;11H  [8;13H  [8;15H  [8;17H  [8;19H  [8;21H  [8;23H  [8;25H  [8;27H  [8;29H  [9;1H  [9;3H  [9;5H  [9;7H  [9;9H  [9;11H  [9;13H  [9;15H  [9;17H  [9;19H  [9;21H  [9;23H  [9;25H  [9;27H  [9;29H  [10;1H  [10;3H  [10;5H  [10;7H  [10;9H  [10;11H  [10;13H  [10;15H  [10;17H  [10;19H  [10;21H  [10;23H  [10;25H  [10;27H  [10;29H  [11;1H  [11;3H  [11;5H  [11;7H  [11;9H  [11;11H  [11;13H  [11;15H  [11;17H  [11;19H  [11;21H  [11;23H  [11;25H  [11;27H  [11;29H  [12;1H  [12;3H  [12;5H  [12;7H  [12;9H  [12;11H  [12;13H  [12;15H  [12;17H  [12;19H  [12;21H  [12;23H  [12;25H  [12;27H  [12;29H  [13;1H  [13;3H  [13;5H  [13;7H  [13;9H  [13;11H  [13;13H  [13;15H  [13;17H  [13;19H  [13;21H  [13;23H  [13;25H  [13;27H  [13;29H  [14;1H  [14;3H  [14;5H  [14;7H  [14;9H  [14;11H  [14;13H  [14;15H  [14;17H  [14;19H  [14;21H  [14;23H  [14;25H  [14;27H  [14;29H  [15;1H  [15;3H  [15;5H  [15;7H  [15;9H  [15;11H  [15;13H  [15;15H  [15;17H  [15;19H  [15;21H  [15;23H  [15;25H  [15;27H  [15;29H  [16;1H  [16;3H  [16;5H  [16;7H  [16;9H  [16;11H  [16;13H  [16;15H  [16;17H  [16;19H  [16;21H  [16;23H  [16;25H  [16;27H  [16;29H  [17;1H  [17;3H  [17;5H  [17;7H  [17;9H  [17;11H  [17;13H  [17;15H  [17;17H  [17;19H  [17;21H  [17;23H  [17;25H  [17;27H  [17;29H  [18;1H  [18;3H  [18;5H  [18;7H  [18;9H  [18;11H  [18;13H  [18;15H  [18;17H  [18;19H  [18;21H =[18;23H==[18;25H==[18;27H==[18;29H= [19;1H  [19;3H  [19;5H  [19;7H  [19;9H  [19;11H  [19;13H  [19;15H  [19;17H  [19;19H  [19;21H =[19;23H==[19;25H==[19;27H==[19;29H= [20;1H  [20;3H  [20;5H  [20;7H  [20;9H  [20;11H  [20;13H  [20;15H  [20;17H  [20;19H  [20;21H =[20;23H==[20;25H==[20;27H==[20;29H= [21;1H  [21;3H  [21;5H  [21;7H  [21;9H  [21;11H  [21;13H  [21;15H  [21;17H  [21;19H  [21;21H =[21;23H==[21;25H==[21;27H==[21;29H= [22;1H  [22;3H  [22;5H  [22;7H  [22;9H  [22;11H  [22;13H  [22;15H  [22;17H  [22;19H  [22;21H =[22;23H==[22;25H==[22;27H==[22;29H= [23;1H  [23;3H  [23;5H  [23;7H  [23;9H  [23;11H  [23;13H  [23;15H  [23;17H  [23;19H  [23;21H  [23;23H  [23;25H  [23;27H  [23;29H  [24;1H  [24;3H  [24;5H  [24;7H  [24;9H  [24;11H  [24;13H  [24;15H  [24;17H  [24;19H  [24;21H  [24;23H  [24;25H  [24;27H  [24;29H  [25;1H  [25;3H  [25;5H  [25;7H  [25;9H  [25;11H  [25;13H  [25;15H  [25;17H  [25;19H  [25;21H  [25;23H  [25;25H  [25;27H  [25;29H  [26;1H  [26;3H  [26;5H  [26;7H  [26;9H  [26;11H  [26;13H  [26;15H  [26;17H  [26;19H  [26;21H  [26;23H  [26;25H  [26;27H  [26;29H  [27;1H  [27;3H  [27;5H  [27;7H  [27;9H  [27;11H  [27;13H  [27;15H  [27;17H  [27;19H  [27;21H  [27;23H  [27;25H  [27;27H  [27;29H  [28;1H  [28;3H  [28;5H  [28;7H  [28;9H  [28;11H  [28;13H  [28;15H  [28;17H  [28;19H  [28;21H  [28;23H  [28;25H  [28;27H  [28;29H  [29;1H  [29;3H  [29;5H  [29;7H  [29;9H  [29;11H  [29;13H  [29;15H  [29;17H  [29;19H  [29;21H  [29;23H  [29;25H  [29;27H  [29;29H  [30;1H  [30;3H  [30;5H  [30;7H  [30;9H  [30;11H  [30;13H  [30;15H  [30;17H  [30;19H  [30;21H  [30;23H  [30;25H  [30;27H  [30;29H  \x1b[?25h",
  };

  const runTest = async (option: keyof typeof outputs): Promise<void> => {
    const process = Deno.run({
      cmd: [
        "deno",
        "run",
        "--no-check",
        "--unstable",
        new URL("./actions/render.ts", import.meta.url).href,
        option,
      ],
      stdout: "piped",
    });

    const output = await process.output();
    process.close();

    const text = await decoder.decode(output);

    assertEquals(
      text,
      outputs[option],
      `Failed at ${option}`,
    );
  };

  const promises = [
    runTest("emptyChanges"),
    runTest("changes"),
    runTest("full"),
  ];

  await Promise.all(promises);
});
