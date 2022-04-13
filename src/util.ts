// Copyright 2021 Im-Beast. All rights reserved. MIT license.

// deno-lint-ignore ban-types
type DynamicValue<T> = T extends Function ? never : T | (() => T);

/**
 * Extract static value from DynamicValue
 * @example
 * ```ts
 * getStaticValue(() => "Hi"); // "Hi"
 * getStaticValue("Hi"); // "Hi"
 * ```
 */
export function getStaticValue<T>(value?: DynamicValue<T>): T {
  return typeof value === "function" ? value() : value;
}

/**
 * Function to get whether given character is full-width
 * - Originally created by sindresorhus https://github.com/sindresorhus/is-fullwidth-code-point/blob/main/index.js
 * @param char - 1 character long string
 * @example
 * ```ts
 * isFullWidth("Ｈ"); // true
 * isFullWidth("H"); // false
 * ```
 */
export function isFullWidth(char: string): boolean {
  if (char.length !== 1) {
    throw new Error("This function takes string that's 1 character long!");
  }

  const codePoint = char.charCodeAt(0);

  return (
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
  );
}

/**
 * Return actual width of the text expressed in columns of the terminal
 * @param text - text which width will be measured
 * @example
 * ```ts
 * textWidth("Hello"); // -> 5
 * textWidth("Ｈello"); // -> 6
 * ```
 */
export function textWidth(text: string): number {
  text = removeStyleCodes(text);
  let width = 0;
  for (const letter of text) {
    width += isFullWidth(letter) ? 2 : 1;
  }
  return width;
}

/**
 * Clamps given number between min and max
 * @param number - number to be clamped
 * @param min - minimal value of clamped number
 * @param max - maximal value of clamped number
 * @example
 * ```ts
 * clamp(-5, 0, 10); // -> 0
 * clamp(0.1, 0, 10); // -> 0.1
 * clamp(11, 0, 10); // -> 10
 * ```
 */
export function clamp(number: number, min: number, max: number): number {
  return Math.min(Math.max(number, min), max);
}

/**
 * Rounds number and then clamps it between min and max
 * @param number - number to be rounded and clamped
 * @param min - minimal value of clamped number
 * @param max - maximal value of clamped number
 * @example
 * ```ts
 * clamp(-5, 0, 10); // -> 0
 * clamp(0.1, 0, 10); // -> 0
 * clamp(0.6, 0, 10); // -> 1
 * clamp(11, 0, 10); // -> 10
 * ```
 */
export function clampAndRound(
  number: number,
  min: number,
  max: number,
): number {
  return clamp(Math.round(number), min, max);
}

/**
 * Capitalizes first letter of given text
 * @param text - text to be capitalized
 * @example
 * ```ts
 * capitalize("sesquipedalian"); // -> "Sesquipedalian"
 * ```
 */
export function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * Removes style codes in text
 * @param text - text to be stripped out of style codes
 * @example
 * ```ts
 * removeStyleCodes("\x1b[32mHello!\x1b[0m") // -> "Hello!"
 * ```
 */
export function removeStyleCodes(text: string): string {
  // deno-lint-ignore no-control-regex
  return text.replace(/\x1b\[\d+m/g, "");
}

/**
 * Creates new object and defines properties to it from `assignments` (including getters and setters!)
 * @param assignments – objects to assign to new created object
 * @example
 * ```ts
 * const one = {
 *  get a() { return Math.random() },
 * };
 *
 * const two = {
 *  get b() { return Math.random() * 2 },
 * };
 *
 * const three = cloneAndAssign(one, two);
 * // Equivailent to:
 * // const three = {
 * //  get a() { return Math.random() },
 * //  get b() { return Math.random() * 2},
 * // };
 * ```
 */
export function cloneAndAssign<O, I>(...assignments: [O, I]): O {
  const obj = {} as O;
  for (const assignment of assignments) {
    Object.defineProperties(obj, Object.getOwnPropertyDescriptors(assignment));
  }
  return obj;
}
