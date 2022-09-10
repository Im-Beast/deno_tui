// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { insertAt, isFullWidth, stripStyles, textWidth, UNICODE_CHAR_REGEXP } from "../../src/utils/strings.ts";
import { assertEquals } from "../deps.ts";

const unicodeString = "♥☭👀f🌏g⚠5✌💢✅💛🌻";
const fullWidths = ["０", "１", "２", "３", "４", "ｈ", "ｉ", "ｊ", "ｋ", "ｌ", "テ", "ク", "ワ"];

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

  await t.step("isFullWidth()", () => {
    for (const character of fullWidths) {
      assertEquals(isFullWidth(character), true);
    }

    assertEquals(isFullWidth("a"), false);
    assertEquals(isFullWidth("ą"), false);
    assertEquals(isFullWidth("1"), false);
    assertEquals(isFullWidth("k"), false);
    assertEquals(isFullWidth("z"), false);
  });

  await t.step("stripStyles()", () => {
    assertEquals(stripStyles("\x1b[32mHello\x1b[0m"), "Hello");
  });

  await t.step("textWidth()", () => {
    assertEquals(textWidth(fullWidths.join("")), fullWidths.length * 2);
    assertEquals(textWidth("Hello"), 5);
  });
});
