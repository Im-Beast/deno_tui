import { createCanvas } from "../src/canvas.ts";
import { TuiStyler } from "../src/types.ts";

export {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.116.0/testing/asserts.ts";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const styler: TuiStyler = {
  foreground: "\x1b[32m",
  background: "\x1b[43m",
  active: {
    foreground: "\x1b[31m",
    background: "\x1b[42m",
  },
  focused: {
    foreground: "\x1b[30m",
    background: "\x1b[41m",
  },
};

export const canvas = createCanvas({
  filler: " ",
  writer: Deno.stdout,
  size: {
    rows: 30,
    columns: 30,
  },
});
