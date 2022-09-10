import { EventEmitter } from "../src/event_emitter.ts";
import { assertEquals } from "./deps.ts";

Deno.test("event_emitter.ts", async (t) => {
  await t.step("EventEmitter", () => {
    const emitter = new EventEmitter();
    let passed = false;
    let triage = 0;

    emitter.on("test", () => {
      passed = true;
    });

    emitter.on("test", () => {
      ++triage;
    }, true);

    emitter.emit("test");
    emitter.emit("test");

    assertEquals(passed, true);
    assertEquals(triage, 1);
  });
});
