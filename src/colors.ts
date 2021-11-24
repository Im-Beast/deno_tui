import { capitalize } from "./util.ts";
import { clampAndRound } from "./util.ts";

export type StyleCode =
  | `\x1b[${number}m`
  | `\x1b[${number};5;${number}m`
  | `\x1b[${number};2;${number};${number};${number}m`;

export function ansi4ToAnsi3(code: number): number {
  return code % 8;
}

export function rgbToAnsi4(r: number, g: number, b: number): number {
  const value = Math.round(Math.max(r, g, b) / 64);
  if (!value) return 0;
  return ((value >= 3 ? 8 : 0) + (Math.round(b / 255) << 2)) |
    (Math.round(g / 255) << 1) |
    Math.round(r / 255);
}

export function ansi8ToAnsi4(code: number): number {
  if (code >= 232) {
    const grayness = (code - 232) * 10 + 8;
    return rgbToAnsi4(grayness, grayness, grayness);
  }

  code -= 16;

  const rem = code % 36;
  const r = (Math.floor(code / 36) / 5) * 255;
  const g = (Math.floor(rem / 6) / 5) * 255;
  const b = ((rem % 6) / 5) * 255;

  return rgbToAnsi4(r, g, b);
}

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

export const baseColors = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
] as const;

export type BaseColors = typeof baseColors[number];

export type Style =
  | Colors
  | Attribute;

export type Colors =
  | BaseColors
  | `bg${Capitalize<BaseColors>}`
  | `light${Capitalize<BaseColors>}`
  | `bgLight${Capitalize<BaseColors>}`;

export type Attribute =
  | "reset"
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "blink"
  | "fastBlink"
  | "invert"
  | "hidden"
  | "strikethrough"
  | "boldOff"
  | "doubleUnderline"
  | "boldOrDimOff"
  | "italicOff"
  | "underlineOff"
  | "blinkOff"
  | "invertOff"
  | "hiddenOff"
  | "strikethroughOff";

export const colors = new Map<Colors, StyleCode>();

for (const [i, color] of baseColors.entries()) {
  const capitalized = capitalize(color) as Capitalize<typeof color>;
  colors.set(color, `\x1b[${30 + i}m`);
  colors.set(`bg${capitalized}`, `\x1b[${40 + i}m`);
  colors.set(`light${capitalized}`, `\x1b[${90 + i}m`);
  colors.set(`bgLight${capitalized}`, `\x1b[${100 + i}m`);
}

export const attributes = new Map<Attribute, StyleCode>([
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
]);

export const styles = new Map<Style, StyleCode>([...colors, ...attributes]);

export function keyword(key: Style): StyleCode {
  return styles.get(key) as StyleCode;
}

export function ansi3(code: number, isBg?: boolean): StyleCode {
  return `\x1b[${code + (isBg ? 40 : 30)}m`;
}

export function ansi4(code: number, isBg?: boolean): StyleCode {
  code = clampAndRound(code, 0, 16);
  return `\x1b[${code + (isBg ? 10 : 0) + (code > 7 ? 82 : 30)}m`;
}

export function ansi8(code: number, isBg?: boolean): StyleCode {
  code = clampAndRound(code, 0, 255);
  return `\x1b[${isBg ? 48 : 38};5;${code}m`;
}

export function rgb(
  r: number,
  g: number,
  b: number,
  isBg?: boolean,
): StyleCode {
  return `\x1b[${isBg ? 48 : 38};2;${clampAndRound(r, 0, 255)};${
    clampAndRound(g, 0, 255)
  };${clampAndRound(b, 0, 255)}m`;
}

export function hsl(
  h: number,
  s: number,
  l: number,
  isBg?: boolean,
): StyleCode {
  return rgb(
    ...hslToRgb(
      clampAndRound(h, 0, 360),
      clampAndRound(s, 0, 100),
      clampAndRound(l, 0, 100),
    ),
    isBg,
  );
}

export function hex(
  hex: string,
  isAnsi8: boolean,
  isBg?: boolean,
): StyleCode | undefined {
  if (/#[0-F]{6}/.test(hex)) {
    const chunks = hex.match(/.{2}/g) as [string, string, string];
    const rgbArr = chunks.map((v) => parseInt(v, 16)) as [
      number,
      number,
      number,
    ];

    return isAnsi8 ? ansi8(rgbToAnsi8(...rgbArr), isBg) : rgb(...rgbArr, isBg);
  }
}
