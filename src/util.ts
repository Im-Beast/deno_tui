// deno-lint-ignore ban-types
type DynamicValue<T> = T extends Function ? never : T | (() => T);

export function getStaticValue<T>(value: DynamicValue<T>): T {
  return typeof value === "function" ? value() : value;
}

// This function was created by sindresorhus: https://github.com/sindresorhus/is-fullwidth-code-point/blob/main/index.js
export function isFullWidth(codePoint: number) {
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

export function textPixelWidth(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; ++i) {
    width += isFullWidth(text.charCodeAt(i)) ? 2 : 1;
  }
  return width;
}
