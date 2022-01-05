// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { capitalize, clampAndRound } from "./util.ts";

/** ANSI escape code */
export type StyleCode =
  | ""
  | `\x1b[${number}m`
  | `\x1b[${number};5;${number}m`
  | `\x1b[${number};2;${number};${number};${number}m`;

/**
 * Converts RGB value to 8bit code
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @example
 * ```ts
 * rgbToAnsi8(255, 127, 127); // -> 210
 * ```
 */
export function rgbToAnsi8(r: number, g: number, b: number): number {
  r = Math.round(r);
  g = Math.round(g);
  b = Math.round(b);

  return r >> 4 === g >> 4 && g >> 4 === b >> 4
    ? r < 8 ? 16 : r > 248 ? 231 : Math.round(((r - 8) / 247) * 24) + 232
    : 16 +
      36 * Math.round((r / 255) * 5) +
      6 * Math.round((g / 255) * 5) +
      Math.round((b / 255) * 5);
}

/**
 * Converts HSL to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Light (0-100)
 * @example
 * ```ts
 * hslToRgb(90, 100, 50); // -> [128, 255, 0]
 * ```
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (number: number) => {
    const k = (number + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return clampAndRound(Math.round(255 * color), 0, 255);
  };

  return [f(0), f(8), f(4)];
}

/** Colors used to generate all 4bit colors */
const baseColors = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
] as const;

type BaseColors = typeof baseColors[number];

/** Names for all 4bit colors */
export type Color =
  | BaseColors
  | `bg${Capitalize<BaseColors>}`
  | `light${Capitalize<BaseColors>}`
  | `bgLight${Capitalize<BaseColors>}`;

/** Colors and attributes */
export type Style =
  | Color
  | Attribute;

/** Map containing all 4bit colors */
export const colors = new Map<Color, StyleCode>();

for (const [i, color] of baseColors.entries()) {
  const capitalized = capitalize(color) as Capitalize<typeof color>;
  colors.set(color, `\x1b[${30 + i}m`);
  colors.set(`bg${capitalized}`, `\x1b[${40 + i}m`);
  colors.set(`light${capitalized}`, `\x1b[${90 + i}m`);
  colors.set(`bgLight${capitalized}`, `\x1b[${100 + i}m`);
}

/** Map containing attributes */
export const attributes = new Map(
  [
    ["reset", "\x1b[0m"],
    ["bold", "\x1b[1m"],
    ["dim", "\x1b[2m"],
    ["italic", "\x1b[3m"],
    ["underline", "\x1b[4m"],
    ["blink", "\x1b[5m"],
    ["fastBlink", "\x1b[6m"],
    ["invert", "\x1b[7m"],
    ["hidden", "\x1b[8m"],
    ["strikethrough", "\x1b[9m"],
    ["boldOff", "\x1b[21m"],
    ["doubleUnderline", "\x1b[21m"],
    ["boldOrDimOff", "\x1b[22m"],
    ["italicOff", "\x1b[23m"],
    ["underlineOff", "\x1b[24m"],
    ["blinkOff", "\x1b[25m"],
    ["invertOff", "\x1b[26m"],
    ["hiddenOff", "\x1b[27m"],
    ["strikethroughOff", "\x1b[28m"],
  ] as const,
);

/** Names for attributes */
export type Attribute = Parameters<typeof attributes.get>[0];

/** Map containing both attributes and 4bit colors */
export const styles = new Map<Style, StyleCode>([...colors, ...attributes]);

/** Alias for using `styles.get(key)`
 * @param key - color/attribute name
 */
export function keyword(key: Style): StyleCode {
  if (Deno.noColor) return "";
  return styles.get(key) as StyleCode;
}

/** Generate 3bit ansi style code
 * @param code - value from 0 to 7 corresponding to color code
 * @param isBg - whether generated color should color background
 */
export function ansi3(code: number, isBg?: boolean): StyleCode {
  if (Deno.noColor) return "";
  code = clampAndRound(code, 0, 7);
  return `\x1b[${code + (isBg ? 40 : 30)}m`;
}

/** Generate 4bit ansi style code
 * @param code - value from 0 to 15 corresponding to color code
 * @param isBg - whether generated color should color background
 */
export function ansi4(code: number, isBg?: boolean): StyleCode {
  if (Deno.noColor) return "";
  code = clampAndRound(code, 0, 15);
  return `\x1b[${code + (isBg ? 10 : 0) + (code > 7 ? 82 : 30)}m`;
}

/** Generate 8bit ansi style code
 * @param code - value from 0 to 255 corresponding to color code
 * @param isBg - whether generated color should color background
 */
export function ansi8(code: number, isBg?: boolean): StyleCode {
  if (Deno.noColor) return "";
  code = clampAndRound(code, 0, 255);
  return `\x1b[${isBg ? 48 : 38};5;${code}m`;
}

/** Generate ansi style code from rgb values
 * @param r - value from 0 to 255, how red color should be
 * @param g - value from 0 to 255, how green color should be
 * @param b - value from 0 to 255, how blue color should be
 * @param isBg - whether generated color should color background
 */
export function rgb(
  r: number,
  g: number,
  b: number,
  isBg?: boolean,
): StyleCode {
  if (Deno.noColor) return "";
  return `\x1b[${isBg ? 48 : 38};2;${clampAndRound(r, 0, 255)};${
    clampAndRound(g, 0, 255)
  };${clampAndRound(b, 0, 255)}m`;
}

/** Generate ansi style code from hsl values
 * @param h - value from 0 to 360, hue of the color
 * @param s - value from 0 to 100, saturation of the color
 * @param l - value from 0 to 100, lightness of the color
 * @param isBg - whether generated color should color background
 */
export function hsl(
  h: number,
  s: number,
  l: number,
  isBg?: boolean,
): StyleCode {
  if (Deno.noColor) return "";
  return rgb(
    ...hslToRgb(
      clampAndRound(h, 0, 360),
      clampAndRound(s, 0, 100),
      clampAndRound(l, 0, 100),
    ),
    isBg,
  );
}

/** Generate ansi style code from hex value
 * @param hex - string or number, ex. 0xffffff or "#FFFFFF"
 * @param isAnsi8 - whether generated should be ansi8 or rgb StyleCode.
 * @param isBg - whether generated color should color background
 */
export function hex(
  hex: string | number,
  isAnsi8: boolean,
  isBg?: boolean,
): StyleCode | undefined {
  if (Deno.noColor) return "";

  if (typeof hex === "number") {
    const rgbArr = [
      0xff & (hex >> 16),
      0xff & (hex >> 8),
      0xff & hex,
    ] as const;
    return isAnsi8 ? ansi8(rgbToAnsi8(...rgbArr), isBg) : rgb(...rgbArr, isBg);
  }

  if (/(#?)([0-F]|[0-f]){6}/.test(hex)) {
    const chunks = hex.replace("#", "").match(/.{2}/g);
    if (!chunks) return undefined;
    const rgbArr = chunks.map((v) => parseInt(v, 16)) as [
      number,
      number,
      number,
    ];

    return isAnsi8 ? ansi8(rgbToAnsi8(...rgbArr), isBg) : rgb(...rgbArr, isBg);
  }

  return undefined;
}
