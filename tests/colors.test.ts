import {
  ansi3,
  ansi4,
  ansi8,
  attributes,
  colors,
  hex,
  hsl,
  hslToRgb,
  keyword,
  rgb,
  rgbToAnsi8,
  styles,
} from "../src/colors.ts";
import { assertEquals } from "./deps.ts";

Deno.test("Colors: hsl -> rgb conversion", () => {
  for (let h = 0; h < 360; h += 90) {
    assertEquals(hslToRgb(h, 100, 100), [255, 255, 255]);
    assertEquals(hslToRgb(360, 100, 0), [0, 0, 0]);
  }

  assertEquals(hslToRgb(0, 100, 50), [255, 0, 0]);
  assertEquals(hslToRgb(90, 100, 50), [128, 255, 0]);
  assertEquals(hslToRgb(180, 100, 50), [0, 255, 255]);
  assertEquals(hslToRgb(270, 100, 50), [128, 0, 255]);
  assertEquals(hslToRgb(360, 100, 50), [255, 0, 0]);
});

Deno.test("Colors: rgb -> ansi8", () => {
  assertEquals(rgbToAnsi8(255, 127, 127), 210);
  assertEquals(rgbToAnsi8(8, 15, 15), 232);
  assertEquals(rgbToAnsi8(7, 15, 15), 16);
  assertEquals(rgbToAnsi8(249, 249, 249), 231);
});

Deno.test("Colors: styles", () => {
  for (const [key, value] of attributes.entries()) {
    assertEquals(styles.get(key), value);
  }

  for (const [key, value] of colors.entries()) {
    assertEquals(styles.get(key), value);
  }
});

Deno.test("Colors: keyword", () => {
  for (const [key, value] of styles.entries()) {
    assertEquals(keyword(key), value);
  }
});

Deno.test("Colors: ansi3", () => {
  for (let i = 0; i < 7; ++i) {
    assertEquals(ansi3(i), `\x1b[3${i}m`);
    assertEquals(ansi3(i, true), `\x1b[4${i}m`);
  }

  assertEquals(ansi3(8), `\x1b[37m`);
  assertEquals(ansi3(8, true), `\x1b[47m`);
});

Deno.test("Colors: ansi4", () => {
  for (let i = 0; i < 15; ++i) {
    if (i < 8) {
      assertEquals(ansi4(i), `\x1b[3${i}m`);
      assertEquals(ansi4(i, true), `\x1b[4${i}m`);
    } else {
      assertEquals(ansi4(i), `\x1b[${82 + i}m`);
      assertEquals(ansi4(i, true), `\x1b[${92 + i}m`);
    }
  }

  assertEquals(ansi4(16), `\x1b[97m`);
  assertEquals(ansi4(16, true), `\x1b[107m`);
});

Deno.test("Colors: ansi8", () => {
  for (let i = 0; i < 255; ++i) {
    assertEquals(ansi8(i), `\x1b[38;5;${i}m`);
    assertEquals(ansi8(i, true), `\x1b[48;5;${i}m`);
  }

  assertEquals(ansi8(256), `\x1b[38;5;255m`);
  assertEquals(ansi8(256, true), `\x1b[48;5;255m`);
});

Deno.test("Colors: rgb", async () => {
  const promises: Promise<void>[] = [];
  for (let r = 0, g = 0, b = 0; r < 255; r += 6, g += 3, b += 4) {
    assertEquals(rgb(r, g, b), `\x1b[38;2;${r};${g};${b}m`);
    assertEquals(rgb(r, g, b, true), `\x1b[48;2;${r};${g};${b}m`);
  }

  await Promise.all(promises);

  assertEquals(rgb(256, 256, 256), `\x1b[38;2;255;255;255m`);
  assertEquals(rgb(256, 256, 256, true), `\x1b[48;2;255;255;255m`);
});

Deno.test("Colors: hsl", () => {
  for (let h = 0, s = 0, l = 0; h < 360; h += 4, ++s, ++l) {
    const [r, g, b] = hslToRgb(h, s, l);
    assertEquals(hsl(h, l, l), `\x1b[38;2;${r};${g};${b}m`);
    assertEquals(hsl(h, s, l, true), `\x1b[48;2;${r};${g};${b}m`);
  }

  assertEquals(hsl(361, 256, 256), `\x1b[38;2;255;255;255m`);
  assertEquals(hsl(361, 256, 256, true), `\x1b[48;2;255;255;255m`);
});

Deno.test("Colors: hex (rgb)", () => {
  assertEquals(hex(0xff00ff, false), "\x1b[38;2;255;0;255m");
  assertEquals(hex("#ff00ff", false), "\x1b[38;2;255;0;255m");
  assertEquals(hex("ff00ff", false), "\x1b[38;2;255;0;255m");
  assertEquals(hex("#FF00FF", false), "\x1b[38;2;255;0;255m");
  assertEquals(hex("FF00FF", false), "\x1b[38;2;255;0;255m");
  assertEquals(hex("#fF00fF", false), "\x1b[38;2;255;0;255m");
  assertEquals(hex("fF00fF", false), "\x1b[38;2;255;0;255m");
  assertEquals(hex(0xff00ff, false, true), "\x1b[48;2;255;0;255m");
  assertEquals(hex("#ff00ff", false, true), "\x1b[48;2;255;0;255m");
  assertEquals(hex("ff00ff", false, true), "\x1b[48;2;255;0;255m");
  assertEquals(hex("#FF00FF", false, true), "\x1b[48;2;255;0;255m");
  assertEquals(hex("FF00FF", false, true), "\x1b[48;2;255;0;255m");
  assertEquals(hex("#fF00fF", false, true), "\x1b[48;2;255;0;255m");
  assertEquals(hex("fF00fF", false, true), "\x1b[48;2;255;0;255m");
});

Deno.test("Colors: hex (ansi8)", () => {
  assertEquals(hex(0xff00ff, true), "\x1b[38;5;201m");
  assertEquals(hex("#ff00ff", true), "\x1b[38;5;201m");
  assertEquals(hex("ff00ff", true), "\x1b[38;5;201m");
  assertEquals(hex("#FF00FF", true), "\x1b[38;5;201m");
  assertEquals(hex("FF00FF", true), "\x1b[38;5;201m");
  assertEquals(hex("#fF00fF", true), "\x1b[38;5;201m");
  assertEquals(hex("fF00fF", true), "\x1b[38;5;201m");
  assertEquals(hex(0xff00ff, true, true), "\x1b[48;5;201m");
  assertEquals(hex("#ff00ff", true, true), "\x1b[48;5;201m");
  assertEquals(hex("ff00ff", true, true), "\x1b[48;5;201m");
  assertEquals(hex("#FF00FF", true, true), "\x1b[48;5;201m");
  assertEquals(hex("FF00FF", true, true), "\x1b[48;5;201m");
  assertEquals(hex("#fF00fF", true, true), "\x1b[48;5;201m");
  assertEquals(hex("fF00fF", true, true), "\x1b[48;5;201m");
});
