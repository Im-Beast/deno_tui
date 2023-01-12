// Copyright 2022 Im-Beast. All rights reserved. MIT license.

/**
 * Regexp that allows for extracting unicode sequences that are supposed to represent single character
 *
 * Used reference: https://github.com/lodash/lodash/blob/master/.internal/unicodeSize.js
 */
export const UNICODE_CHAR_REGEXP =
  /\ud83c[\udffb-\udfff](?=\ud83c[\udffb-\udfff])|(?:(?:\ud83c\udff4\udb40\udc67\udb40\udc62\udb40(?:\udc65|\udc73|\udc77)\udb40(?:\udc6e|\udc63|\udc6c)\udb40(?:\udc67|\udc74|\udc73)\udb40\udc7f)|[^\ud800-\udfff][\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]?|[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]|\ud83c[\udffb-\udfff])?)*/g;

const STRIP_STYLE_REGEXP = /\x1b\[([0-9]|;)+m/gi;

/** Strips string of all styles */
export function stripStyles(string: string): string {
  return string.replaceAll(STRIP_STYLE_REGEXP, "");
}

/** Inserts string into string on given index */
export function insertAt(string: string, index: number, value: string): string {
  return string.slice(0, index) + value + string.slice(index);
}

/** Returns real text width */
export function textWidth(text: string): number {
  if (!text) return 0;

  let width = 0;
  const strippedString = stripStyles(text);
  for (let i = 0; i < strippedString.length; i++) {
    width += characterWidth(strippedString[i]);
  }

  return width;
}

/**
 * Check whether character is full width
 *
 * Originally created by sindresorhus: https://github.com/sindresorhus/is-fullwidth-code-point/blob/main/index.js
 */
export function characterWidth(character: string): number {
  const codePoint = character.charCodeAt(0);

  if (
    codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (0x2e80 <= codePoint && codePoint <= 0x3247 && codePoint !== 0x303f) ||
      (0x3250 <= codePoint && codePoint <= 0x4dbf) ||
      (0x4e00 <= codePoint && codePoint <= 0xa4c6) ||
      (0xa960 <= codePoint && codePoint <= 0xa97c) ||
      (0xac00 <= codePoint && codePoint <= 0xd7a3) ||
      (0xf900 <= codePoint && codePoint <= 0xfaff) ||
      (0xfe10 <= codePoint && codePoint <= 0xfe19) ||
      (0xfe30 <= codePoint && codePoint <= 0xfe6b) ||
      (0xff01 <= codePoint && codePoint <= 0xff60) ||
      (0xffe0 <= codePoint && codePoint <= 0xffe6) ||
      (0x1b000 <= codePoint && codePoint <= 0x1b001) ||
      (0x1f200 <= codePoint && codePoint <= 0x1f251) ||
      (0x20000 <= codePoint && codePoint <= 0x3fffd))
  ) {
    return 2;
  }

  return 1;
}
