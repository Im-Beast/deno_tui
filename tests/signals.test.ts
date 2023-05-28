import { Computed, Effect, Signal } from "../src/signals.ts";
import { assertArrayIncludes, assertEquals } from "./deps.ts";

// TODO: object tests
// TODO: computed of computed test
// TODO: check if only changed values emits

Deno.test("signals.ts", async (t) => {
  await t.step("Signal", () => {
    let subCount = 0;
    const signal = new Signal(0);

    signal.subscribe(() => ++subCount);

    assertEquals(signal.value, 0);
    assertEquals(subCount, 0); // subscribers get info after value being changed, not like effect

    signal.value = 5;
    assertEquals(signal.value, 5);
    assertEquals(subCount, 1);

    signal.value = 10;
    assertEquals(signal.value, 10);
    assertEquals(subCount, 2);

    signal.dispose();
    try {
      signal.value = 15;
    } catch (_error) {
      assertEquals(signal.value, 10); // value doesn't change after being disposed
      assertEquals(subCount, 2); // doesn't run subscribers after being disposed
    }
  });

  await t.step("Computed", async () => {
    let subCount = 0;

    const signal = new Signal(0);
    const computed = new Computed(() => signal.value * 2);

    computed.subscribe(() => ++subCount);

    // Computed tracks dependencies for one event loop tick
    await Promise.resolve();

    assertEquals(signal.value, 0);
    assertEquals(computed.value, 0);
    assertEquals(subCount, 0); // subscribers get info after value being changed, not like effect

    signal.value = 5;
    assertEquals(signal.value, 5);
    assertEquals(computed.value, 10);
    assertEquals(subCount, 1);

    signal.value = 10;
    assertEquals(signal.value, 10);
    assertEquals(computed.value, 20);
    assertEquals(subCount, 2);

    computed.dispose();
    signal.value = 15;

    assertEquals(signal.value, 15);
    assertEquals(computed.value, 20); // value doesn't change after being disposed
    assertEquals(subCount, 2); // doesn't run subscribers after being disposed
  });

  await t.step("Effect", async () => {
    let runs = 0;
    let effectOutput = "";

    const signal = new Signal(1);
    const computed = new Computed(() => signal.value * 2);

    const signal2 = new Signal(1);
    const computed2 = new Computed(() => signal2.value * 3);

    const computed3 = new Computed(() => computed.value * computed2.value);

    const effect = new Effect(() => {
      ++runs;
      effectOutput =
        `s1:${signal.value}, c1:${computed.value} | s2: ${signal2.value}, c2:${computed2.value} | c3: ${computed3.value}`;
    });

    await Promise.resolve();

    // Effect gets the "root" of signals
    assertEquals(effect.dependants.size, 2);
    assertArrayIncludes(Array.from(effect.dependants), [signal, signal2]);

    assertEquals(runs, 1);
    assertEquals(
      effectOutput,
      `s1:${1}, c1:${2} | s2: ${1}, c2:${3} | c3: ${6}`,
    );

    signal.value = 5;
    signal2.value = 10;

    // Even though all of the computes have also changed it needs to rerun just once per sroot signal
    assertEquals(runs, 3);
    assertEquals(
      effectOutput,
      `s1:${5}, c1:${10} | s2: ${10}, c2:${30} | c3: ${300}`,
    );

    signal.value = 15;
    signal2.dispose();

    assertEquals(effect.dependants.size, 1);
    assertEquals(runs, 4);
    assertEquals(
      effectOutput,
      `s1:${15}, c1:${30} | s2: ${10}, c2:${30} | c3: ${900}`,
    );

    effect.dispose();

    signal.value = 15;
    assertEquals(runs, 4);
    assertEquals(
      effectOutput,
      `s1:${15}, c1:${30} | s2: ${10}, c2:${30} | c3: ${900}`,
    );
  });
});
