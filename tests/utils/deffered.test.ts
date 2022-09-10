// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { sleep } from "../../src/utils/async.ts";
import { Deffered } from "../../src/utils/deffered.ts";
import { assert } from "../deps.ts";

Deno.test("utils/deffered.ts", async (t) => {
  await t.step("Deffered", async () => {
    const deffered = new Deffered();
    const deffered2 = new Deffered();

    setTimeout(deffered.resolve, 10);
    setTimeout(deffered2.reject, 15);

    setTimeout(() => {
      if (deffered.state === "pending") {
        assert(false, "Deffered still pending when it should already be resolved");
      }
    }, 20);

    await deffered
      .then(() => {
        assert(true);
      })
      .catch(() => {
        assert(false, "Deffered rejected instead of resolving");
      });

    await deffered2
      .then(() => assert(false, "Deffered resolved instead of rejecting"))
      .catch(() => assert(true));

    await sleep(10);
  });
});
