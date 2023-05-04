// Copyright 2023 Im-Beast. All rights reserved. MIT license.

import { SortedArray } from "../../src/utils/sorted_array.ts";
import { assertEquals } from "../deps.ts";

Deno.test("utils/sorted_array.ts", async (t) => {
  await t.step("SortedArray", () => {
    const array = new SortedArray<number>((a, b) => b - a);

    array.push(1, 10, -5, -2, 11, 100, -1000);
    assertEquals([...array], [100, 11, 10, 1, -2, -5, -1000]);
    array.remove(11);
    assertEquals([...array], [100, 10, 1, -2, -5, -1000]);
  });
});
