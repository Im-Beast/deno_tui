// Copyright 2023 Im-Beast. All rights reserved. MIT license.

/**
 * Regexp that allows for extracting unicode sequences that are supposed to represent single character
 *
 * Used reference: https://github.com/lodash/lodash/blob/master/.internal/unicodeSize.js
 */
export const UNICODE_CHAR_REGEXP =
  /\ud83c[\udffb-\udfff](?=\ud83c[\udffb-\udfff])|(?:(?:\ud83c\udff4\udb40\udc67\udb40\udc62\udb40(?:\udc65|\udc73|\udc77)\udb40(?:\udc6e|\udc63|\udc6c)\udb40(?:\udc67|\udc74|\udc73)\udb40\udc7f)|[^\ud800-\udfff][\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]?|[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff\u1ab0-\u1aff\u1dc0-\u1dff]|\ud83c[\udffb-\udfff])?)*/g;

export function spacifyChars(input: string[]): string[] {
  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    const charWidth = textWidth(char);
    if (charWidth > 1 && input.length > i + 1) {
      for (let j = 1; j < charWidth; ++j) {
        input.splice(i + j, 0, "");
      }
      i += charWidth - 1;
    }
  }
  return input;
}

const empty: string[] = [];
/** Converts given text to array of strings which consist of sequences which represent a single character */
export function getMultiCodePointCharacters(text: string): string[] {
  if (!text) return empty;
  const matched = text.match(UNICODE_CHAR_REGEXP);

  if (matched?.includes("\x1b")) {
    const arr: string[] = [];
    let i = 0;
    let ansi = 0;
    let lastStyle = "";
    for (const char of matched) {
      arr[i] ??= "";
      arr[i] += lastStyle + char;

      if (char === "\x1b") {
        ++ansi;
        lastStyle += "\x1b";
      } else if (ansi) {
        lastStyle += char;

        if (ansi === 3 && char === "m" && lastStyle[lastStyle.length - 2] === "0") {
          lastStyle = "";
        }

        if (char === "m") {
          ansi = 0;
        } else {
          ++ansi;
        }
      } else {
        ++i;
      }
    }

    return arr;
  }

  return matched ?? empty;
}

/** Strips string of all its styles */
export function stripStyles(string: string): string {
  let stripped = "";
  let ansi = false;
  const len = string.length;
  for (let i = 0; i < len; ++i) {
    const char = string[i];
    if (char === "\x1b") {
      ansi = true;
      i += 2; // [ "\x1b" "[" "X" "m" ] <-- shortest ansi sequence
    } else if (char === "m" && ansi) {
      ansi = false;
    } else if (!ansi) {
      stripped += char;
    }
  }
  return stripped;
}

/** Inserts {value} into {string} on given {index} */
export function insertAt(string: string, index: number, value: string): string {
  return string.slice(0, index) + value + string.slice(index);
}

/** Returns real {text} width */
export function textWidth(text: string, start = 0): number {
  if (!text) return 0;

  let width = 0;
  let ansi = false;
  const len = text.length;
  for (let i = start; i < len; ++i) {
    const char = text[i];
    if (char === "\x1b") {
      ansi = true;
      i += 2; // [ "\x1b" "[" "X" "m" ] <-- shortest ansi sequence
    } else if (char === "m" && ansi) {
      ansi = false;
    } else if (!ansi) {
      width += characterWidth(char);
    }
  }

  return width;
}
/** Crops {text} to given {width} */
export function cropToWidth(text: string, width: number): string {
  const stripped = stripStyles(text);
  const letter = stripped[width];

  if (textWidth(text) <= width) return text;

  text = text.slice(0, text.lastIndexOf(letter));
  if (textWidth(text) <= width) return text;

  const start = text.indexOf(letter);
  const knownPart = text.slice(0, start);
  const knownWidth = textWidth(knownPart);
  if (knownWidth === width) return knownPart;

  do {
    const index = text.lastIndexOf(letter);
    text = text.slice(0, index);
  } while ((knownWidth + textWidth(text, start)) > width);
  return text;
}

/**
 * Return width of given character
 *
 * Originally created by sindresorhus: https://github.com/sindresorhus/is-fullwidth-code-point/blob/main/index.js
 */
export function characterWidth(character: string): number {
  const codePoint = character.charCodeAt(0);

  if (codePoint === 0x200B) {
    return 0;
  }

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

/** Returns capitalized string created from {text} */
export function capitalize<T extends string>(text: T): Capitalize<T> {
  return (text[0].toUpperCase() + text.slice(1)) as Capitalize<T>;
}

/** Split a string into substrings using the specified separator to given array */
export function splitToArray(string: string, splitter: string, array: string[], clean = true): void {
  if (clean && array.length > 0) {
    while (array.length > 0) {
      array.pop();
    }
  }

  let index = string.indexOf(splitter);

  if (index === -1) {
    array.push(string);
    return;
  }

  const skip = splitter.length;
  let previousIndex = -skip;

  while (index !== -1) {
    array.push(string.slice(previousIndex + skip, index));

    previousIndex = index;
    index = string.indexOf(splitter, index + skip);
  }

  array.push(string.slice(previousIndex + skip));
}
