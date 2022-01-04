export {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.116.0/testing/asserts.ts";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function encodeBuffer(buffer: string): string;
export function encodeBuffer(buffer: [string, string][][]): string;
export function encodeBuffer(buffer: string | [string, string][][]): string {
  if (typeof buffer === "string") {
    return btoa(buffer.replaceAll(/\s/g, ""));
  }
  return btoa(buffer.map((x) => x.map((x) => x.join("")).join("")).join(""));
}
