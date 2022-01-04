// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  capitalize,
  clamp,
  clampAndRound,
  getStaticValue,
  isFullWidth,
  removeStyleCodes,
  textWidth,
} from "../mod.ts";
import { assertEquals, assertThrows } from "./deps.ts";

Deno.test("Util", async (t) => {
  await t.step("isFullWidth", () => {
    // deno-fmt-ignore
    const fullWidthCharacters = [ "０","１","２","３","４","５","６","７","８","９","Ａ","Ｂ","Ｃ","Ｄ","Ｅ","Ｆ","Ｇ","Ｈ","Ｉ","Ｊ","Ｋ","Ｌ","Ｍ","Ｎ","Ｏ","Ｐ","Ｑ","Ｒ","Ｓ","Ｔ","Ｕ","Ｖ","Ｗ","Ｘ","Ｙ","Ｚ","ａ","ｂ","ｃ","ｄ","ｅ","ｆ","ｇ","ｈ","ｉ","ｊ","ｋ","ｌ","ｍ","ｎ","ｏ","ｐ","ｑ","ｒ","ｓ","ｔ","ｕ","ｖ","ｗ","ｘ","ｙ","ｚ","，","．","：","；","！","？","＂","＇","｀","＾","～","￣","＿","＆","＠","＃","％","＋","－","＊","＝","＜","＞","（","）","［","］","｛","｝","｟","｠","｜","￤","／","＼","￢","＄","￡","￠","￦","￥" ]
    // deno-fmt-ignore
    const normalCharacters = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",",",".","!","@","#","$","%","^","&","*","(",")","-","_","=","+","|","\\",";",":","?","<",">","/"]

    for (const char of fullWidthCharacters) {
      assertEquals(isFullWidth(char), true);
    }

    for (const char of normalCharacters) {
      assertEquals(isFullWidth(char), false);
    }

    assertThrows(() => isFullWidth("more than one char"));
  });

  await t.step("textWidth", () => {
    assertEquals(textWidth("Hello"), 5);
    assertEquals(textWidth("ＨＥＬＬＯ"), 10);
    assertEquals(textWidth("Ｈello"), 6);
    assertEquals(textWidth(""), 0);
    assertEquals(textWidth(" "), 1);
  });

  await t.step("capitalize", () => {
    assertEquals(capitalize("hello world"), "Hello world");
  });

  await t.step("clamp", () => {
    assertEquals(clamp(5, 1, 3), 3);
    assertEquals(clamp(2, 1, 3), 2);
    assertEquals(clamp(0, 1, 3), 1);
  });

  await t.step("clampAndRound", () => {
    assertEquals(clampAndRound(5, 1, 3), 3);
    assertEquals(clampAndRound(2.3, 1, 3), 2);
    assertEquals(clampAndRound(0, 1, 3), 1);
  });

  await t.step("getStaticValue", () => {
    assertEquals(getStaticValue("Hi"), "Hi");
    assertEquals(getStaticValue(() => "Hi"), "Hi");
    assertEquals(getStaticValue(undefined), undefined);
    assertEquals(getStaticValue(() => undefined), undefined);
  });

  await t.step("removeStyleCodes", () => {
    assertEquals(removeStyleCodes("\x1b[32mHello\x1b[0m"), "Hello");
  });
});
