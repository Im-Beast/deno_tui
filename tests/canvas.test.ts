// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  CanvasStyler,
  capitalize,
  Color,
  colors,
  compileStyler,
  compileStylerValue,
  createCanvas,
  drawPixel,
  drawRectangle,
  drawText,
  moveCursor,
  styleStringFromStyler,
  styleText,
} from "../mod.ts";
import { assertEquals, assertThrows } from "./deps.ts";

Deno.test("Canvas", async (t) => {
  // https://github.com/denoland/deno/issues/13265
  Deno.addSignalListener = () => {};

  const decoder = new TextDecoder();

  const writer = Deno.stdout;

  const canvas = createCanvas({
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

  await t.step("Canvas: create canvas", () => {
    assertEquals(Object.getOwnPropertyNames(canvas), [
      "size",
      "offset",
      "filler",
      "writer",
      "smartRender",
      "fps",
      "lastTime",
      "deltaTime",
      "frameBuffer",
      "prevBuffer",
      "refreshed",
    ]);
  });

  await t.step("Canvas: styler", () => {
    for (const [color, code] of colors) {
      if (color.startsWith("bg")) continue;

      assertEquals(
        compileStylerValue(color, "foreground"),
        code,
      );
      assertEquals(
        compileStylerValue(color, "frame"),
        code,
      );

      const bgColor = `bg${capitalize(color)}` as Color;

      assertEquals(
        compileStylerValue(color, "background"),
        colors.get(bgColor),
      );
      assertEquals(
        compileStylerValue(bgColor, "background"),
        colors.get(bgColor),
      );
    }

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

  await t.step("Canvas: frameBuffer size", () => {
    assertEquals(_canvas.frameBuffer.length, consoleSize.rows);
    assertEquals(_canvas.frameBuffer[0].length, ~~(consoleSize.columns / 2));

    const size = canvas.size;
    assertEquals(canvas.frameBuffer.length, size.rows);
    assertEquals(canvas.frameBuffer[0].length, ~~(size.columns / 2));
  });

  await t.step("Canvas: drawing pixel", () => {
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

  await t.step("Canvas: drawing rectangle", () => {
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

  await t.step("Canvas: draw text", () => {
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

  await t.step("Canvas: styleText", () => {
    assertEquals(
      styleText("Hello world", "\x1b[32m"),
      "\x1b[32mHello world\x1b[0m",
    );
  });

  await t.step("Canvas: moveCursor", () => {
    assertEquals(moveCursor(4, 7), "\x1b[4;7H");
  });

  await t.step("Canvas: rendering", async () => {
    const outputs = {
      color: {
        full:
          "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBtbMzJtSBtbMG0bWzMybWUbWzBtG1szMm1sG1swbRtbMzJtbBtbMG0bWzMybW8bWzBtG1szMm0gG1swbRtbMzJtdxtbMG0bWzMybW8bWzBtG1szMm1yG1swbRtbMzJtbBtbMG0bWzMybWQbWzBtICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg\n\x1b[?25h",
        changes:
          "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBtbMzJtSBtbMG0bWzMybWUbWzBtG1szMm1sG1swbRtbMzJtbBtbMG0bWzMybW8bWzBtG1szMm0gG1swbRtbMzJtdxtbMG0bWzMybW8bWzBtG1szMm1yG1swbRtbMzJtbBtbMG0bWzMybWQbWzBtICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg\n\x1b[?25h",
      },
      noColor: {
        full:
          "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBtbMzJtSBtbMG0bWzMybWUbWzBtG1szMm1sG1swbRtbMzJtbBtbMG0bWzMybW8bWzBtG1szMm0gG1swbRtbMzJtdxtbMG0bWzMybW8bWzBtG1szMm1yG1swbRtbMzJtbBtbMG0bWzMybWQbWzBtICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg\n\x1b[?25h",
        changes:
          "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBtbMzJtSBtbMG0bWzMybWUbWzBtG1szMm1sG1swbRtbMzJtbBtbMG0bWzMybW8bWzBtG1szMm0gG1swbRtbMzJtdxtbMG0bWzMybW8bWzBtG1szMm1yG1swbRtbMzJtbBtbMG0bWzMybWQbWzBtICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgPT09PT09PT0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg\n\x1b[?25h",
      },
    };

    const runTest = async (
      option: "full" | "changes",
      noColor: boolean,
    ): Promise<void> => {
      const process = Deno.run({
        cmd: [
          "deno",
          "run",
          "--no-check",
          "--unstable",
          new URL("canvas_render.ts", import.meta.url).href,
          option,
        ],
        stdout: "piped",
      });

      const output = await process.output();
      process.close();

      const text = await decoder.decode(output);

      const expectedOutput = outputs[noColor ? "noColor" : "color"][option];
      assertEquals(
        text,
        expectedOutput,
        `Failed at ${option} ${noColor ? "noColor" : ""}`,
      );
    };

    await Promise.all(
      [
        runTest("changes", false),
        runTest("changes", true),
        runTest("full", false),
        runTest("full", true),
      ],
    );
  });
});
