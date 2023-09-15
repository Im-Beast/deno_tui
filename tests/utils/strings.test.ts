// Copyright 2023 Im-Beast. All rights reserved. MIT license.

import { getMultiCodePointCharacters } from "../../mod.ts";
import {
  characterWidth,
  insertAt,
  reapplyCharacterStyles,
  stripStyles,
  textWidth,
  UNICODE_CHAR_REGEXP,
} from "../../src/utils/strings.ts";
import { assertEquals } from "../deps.ts";

const unicodeString = "♥☭👀f🌏g⚠5✌💢✅💛🌻";
const fullWidths = ["０", "１", "２", "３", "４", "ｈ", "ｉ", "ｊ", "ｋ", "ｌ", "テ", "ク", "ワ"];
const halfWidths = ["a", "b", "1", "ą", "ł", "､", "ﾝ", "ｼ"];

Deno.test("utils/strings.ts", async (t) => {
  await t.step("UNICODE_CHAR_REGEXP", () => {
    const unicodeCharacters = unicodeString.match(UNICODE_CHAR_REGEXP)!;

    assertEquals(unicodeString.length, 18);
    assertEquals(unicodeCharacters.length, 13);
  });

  await t.step("insertAt()", () => {
    assertEquals(insertAt("est", 0, "T"), "Test");
    assertEquals(insertAt("test", 4, "!"), "test!");
  });

  await t.step("characterWidth()", () => {
    for (const character of fullWidths) {
      assertEquals(characterWidth(character), 2);
    }

    for (const character of halfWidths) {
      assertEquals(characterWidth(character), 1);
    }
  });

  await t.step("stripStyles()", () => {
    assertEquals(stripStyles("\x1b[32mHello\x1b[0m"), "Hello");
  });

  await t.step("textWidth()", () => {
    assertEquals(textWidth(fullWidths.join("")), fullWidths.length * 2);
    assertEquals(textWidth("Hello"), 5);
  });

  await t.step("getMultiCodePointCharacters()", () => {
    assertEquals(getMultiCodePointCharacters("dog"), ["d", "o", "g"]);
    assertEquals(getMultiCodePointCharacters("\x1b[32mHi\x1b[0m"), [
      "\x1b",
      "[",
      "3",
      "2",
      "m",
      "H",
      "i",
      "\x1b",
      "[",
      "0",
      "m",
    ]);
  });

  await t.step("reapplyCharacterStyles()", () => {
    assertEquals(
      reapplyCharacterStyles(
        getMultiCodePointCharacters("dog"),
      ),
      ["d", "o", "g"],
    );

    assertEquals(
      reapplyCharacterStyles(
        getMultiCodePointCharacters("\x1b[32mHello world!"),
      ),
      [
        "\x1b[32mH",
        "\x1b[32me",
        "\x1b[32ml",
        "\x1b[32ml",
        "\x1b[32mo",
        "\x1b[32m ",
        "\x1b[32mw",
        "\x1b[32mo",
        "\x1b[32mr",
        "\x1b[32ml",
        "\x1b[32md",
        "\x1b[32m!",
      ],
    );
  });
});
