export {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.116.0/testing/asserts.ts";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
