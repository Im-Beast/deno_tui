// Copyright 2023 Im-Beast. All rights reserved. MIT license.

import { sleep } from "../../src/utils/async.ts";
import { assertAlmostEquals } from "../deps.ts";

Deno.test("utils/async.ts", async (t) => {
  await t.step("sleep()", async () => {
    const intervals = [0, 1, 33, 50, 100, 150];

    for (const interval of intervals) {
      const start = Date.now();
      await sleep(interval);
      assertAlmostEquals(Date.now() - start, interval, 4);
    }
  });
});
