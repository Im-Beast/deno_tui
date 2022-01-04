// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { createEventEmitter } from "../mod.ts";
import { assert, assertEquals, sleep } from "./deps.ts";

Deno.test("Event Emitter", async (t) => {
  const eventEmitter = createEventEmitter<"event", undefined>();

  await t.step("on", async () => {
    let passedTest = false;

    eventEmitter.on("event", () => passedTest = true);
    eventEmitter.emit("event");

    await sleep(1);

    assert(passedTest);
  });

  await t.step("once", async () => {
    let timesPassed = 0;

    eventEmitter.once("event", () => ++timesPassed);
    eventEmitter.emit("event");
    eventEmitter.emit("event");

    await sleep(1);

    assertEquals(timesPassed, 1);
  });

  await t.step("off(event)", async () => {
    let timesPassed = 0;

    eventEmitter.on("event", () => ++timesPassed);
    eventEmitter.emit("event");
    eventEmitter.off("event");
    eventEmitter.emit("event");

    await sleep(1);

    assertEquals(timesPassed, 1);
  });

  await t.step("off(event, func)", async () => {
    let timesPassed = 0;
    let timesPassed2 = 0;

    const func = () => ++timesPassed;
    eventEmitter.on("event", func);
    eventEmitter.on("event", () => ++timesPassed2);
    eventEmitter.emit("event");
    eventEmitter.off("event", func);
    eventEmitter.emit("event");

    await sleep(1);

    assertEquals(timesPassed, 1);
    assertEquals(timesPassed2, 2);
  });

  await t.step('off("*")', async () => {
    let timesPassed = 0;
    let timesPassed2 = 0;

    eventEmitter.on("event", () => ++timesPassed);
    eventEmitter.on("event", () => ++timesPassed2);
    eventEmitter.emit("event");
    eventEmitter.off("*");
    eventEmitter.emit("event");

    await sleep(1);

    assertEquals(timesPassed, 1);
    assertEquals(timesPassed2, 1);
  });

  await t.step("priority", async () => {
    const priority: number[] = [];
    for (let i = 0; i < 10; ++i) {
      eventEmitter.on("event", () => priority.push(i), i);
    }

    eventEmitter.emit("event");

    await sleep(1);

    assertEquals(priority, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });
});
