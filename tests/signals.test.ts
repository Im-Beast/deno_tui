// Copyright 2023 Im-Beast. MIT license.
import { Computed, Effect, Signal } from "../src/signals/mod.ts";
import { IS_REACTIVE } from "../src/signals/reactivity.ts";
import { assertArrayIncludes, assertEquals, assertThrows } from "./deps.ts";

Deno.test("signals/mod.ts", async (t) => {
  await t.step("Signal", async (t) => {
    let subCount = 0;
    let fiveCalls = 0;
    let tenCalls = 0;

    const abortController = new AbortController();
    const abortController2 = new AbortController();

    const signal = new Signal(0);

    const subCallback = () => ++subCount;
    signal.subscribe(subCallback, abortController.signal);
    // call only when signal is equal to 5
    const fiveCallback = () => ++fiveCalls;
    signal.when(5, fiveCallback);
    signal.when(10, () => ++tenCalls, abortController2.signal);

    assertEquals(signal.value, 0);
    assertEquals(subCount, 0); // subscribers get info after value being changed, not like effect

    signal.value = 5;
    assertEquals(signal.value, 5);
    assertEquals(subCount, 1);
    assertEquals(fiveCalls, 1);

    // When unsubscribed it won't call that callback again
    signal.unsubscribe(subCallback);
    signal.value = 7;
    assertEquals(subCount, 1);

    // Re-subscribe
    signal.subscribe(subCallback);

    // The same effect as unsubscribe can be achieved using AbortSignal when passed as third argument
    abortController.abort();
    signal.value = 8;
    assertEquals(subCount, 1);

    signal.subscribe(subCallback);

    // Re-subscribe again
    signal.subscribe(subCallback);

    signal.value = 10;
    signal.value = 10; // doesnt update when value isnt changed
    assertEquals(signal.value, 10);
    assertEquals(subCount, 2);
    assertEquals(fiveCalls, 1);
    assertEquals(tenCalls, 1);

    signal.value = 5;
    signal.value = 5;
    assertEquals(fiveCalls, 2);

    abortController2.abort();

    signal.value = 10;
    assertEquals(tenCalls, 1);

    signal.drop(5, fiveCallback);

    signal.value = 5;
    assertEquals(fiveCalls, 2);

    signal.value = 10;

    signal.dispose();
    try {
      signal.value = 15;
    } catch (_error) {
      assertEquals(signal.value, 10); // value doesn't change after being disposed
      assertEquals(subCount, 6); // doesn't run subscribers after being disposed
    }

    await t.step("Deep observe", async (t) => {
      await t.step("Object", async () => {
        let subCount = 0;
        const signal = new Signal<Record<string, string>>({ foo: "bar" }, {
          deepObserve: true,
        });
        signal.subscribe(() => ++subCount);

        let subCount2 = 0;
        const signal2 = new Signal<Record<string, string>>({ foo: "bar" }, {
          deepObserve: true,
          watchObjectIndex: true,
        });
        signal2.subscribe(() => ++subCount2);

        const computedObj = { foo: "" };
        const computed = new Computed(() => {
          computedObj.foo = signal.value.foo + signal2.value.foo;
          return computedObj;
        });
        await Promise.resolve(); // wait for computed to track dependencies

        assertEquals(IS_REACTIVE in signal.value, true);
        assertEquals(IS_REACTIVE in signal2.value, true);

        assertEquals(subCount, 0);
        assertEquals(subCount2, 0);

        signal.value.foo = "baz";
        signal2.value.foo = "baz";
        assertEquals(signal.value.foo, "baz");
        assertEquals(signal2.value.foo, "baz");
        assertEquals(computed.value.foo, "bazbaz");
        assertEquals(subCount, 1);
        assertEquals(subCount2, 1);

        signal.value.bar = "bad";
        signal.value.bar = "bad"; // doesnt update when value isnt changed
        signal2.value.bar = "bad";
        signal2.value.bar = "bad"; // doesnt update when value isnt changed
        assertEquals(signal.value.bar, "bad");
        assertEquals(signal2.value.bar, "bad");
        assertEquals(computed.value.foo, "bazbaz");
        assertEquals(subCount, 1); // doesn't track new properties
        assertEquals(subCount2, 2); // does track new properties

        signal.dispose();
        signal2.dispose();

        signal.value.foo = "bar";
        signal2.value.foo = "bar";

        assertEquals(subCount, 1); // doesn't run after being disposed
        assertEquals(subCount2, 2); // doesn't run after being disposed
      });

      await t.step("Array", async () => {
        let subCount = 0;
        const signal = new Signal([1, 2, 3], {
          deepObserve: true,
        });
        signal.subscribe(() => ++subCount);

        let subCount2 = 0;
        const signal2 = new Signal([1, 2, 3], {
          deepObserve: true,
          watchObjectIndex: true,
        });
        signal2.subscribe(() => ++subCount2);

        const computed = new Computed(() => {
          return signal.value.concat(signal2.value);
        });
        await Promise.resolve(); // wait for computed to track dependencies

        assertEquals(IS_REACTIVE in signal.value, true);
        assertEquals(IS_REACTIVE in signal2.value, true);

        assertEquals(subCount, 0);
        assertEquals(subCount2, 0);

        signal.value.push(4);
        signal2.value.push(4);
        assertEquals(signal.value, [1, 2, 3, 4]);
        assertEquals(signal2.value, [1, 2, 3, 4]);
        assertEquals(computed.value, [1, 2, 3, 4, 1, 2, 3, 4]);
        assertEquals(subCount, 1);
        assertEquals(subCount2, 1);

        signal.value.pop();
        signal2.value.pop();
        assertEquals(signal.value, [1, 2, 3]);
        assertEquals(signal2.value, [1, 2, 3]);
        assertEquals(computed.value, [1, 2, 3, 1, 2, 3]);
        assertEquals(subCount, 2);
        assertEquals(subCount2, 2);

        signal.value.splice(1, 1, 6);
        signal2.value.splice(1, 1, 9);
        assertEquals(signal.value, [1, 6, 3]);
        assertEquals(signal2.value, [1, 9, 3]);
        assertEquals(computed.value, [1, 6, 3, 1, 9, 3]);
        assertEquals(subCount, 3);
        assertEquals(subCount2, 3);

        signal.value[6] = 9;
        signal.value[6] = 9; // doesnt update when value isnt changed
        signal2.value[6] = 9;
        signal2.value[6] = 9; // doesnt update when value isnt changed
        assertEquals(signal.value[6], 9);
        assertEquals(signal.value[6], 9);
        assertEquals(computed.value, signal.value.concat(signal2.value));
        assertEquals(subCount, 3); // doesn't track new properties
        assertEquals(subCount2, 4); // does track new properties

        signal.dispose();
        signal2.dispose();

        signal.value.pop();
        signal2.value.pop();

        assertEquals(subCount, 3); // doesn't run after being disposed
        assertEquals(subCount2, 4); // doesn't run after being disposed
      });

      await t.step("Map", () => {
        let subCount = 0;
        const signal = new Signal(new Map([["foo", "bar"]]), {
          deepObserve: true,
        });
        signal.subscribe(() => ++subCount);

        let subCount2 = 0;
        const signal2 = new Signal(new Map([["foo", "bar"]]), {
          deepObserve: true,
          watchMapUpdates: true,
        });
        signal2.subscribe(() => ++subCount2);

        assertEquals(subCount, 0);
        assertEquals(subCount2, 0);

        assertEquals(IS_REACTIVE in signal.value, true);
        assertEquals(IS_REACTIVE in signal2.value, true);

        signal.value.set("baz", "bad");
        signal2.value.set("baz", "bad");
        assertEquals(signal.value, new Map([["foo", "bar"], ["baz", "bad"]]));
        assertEquals(signal2.value, new Map([["foo", "bar"], ["baz", "bad"]]));
        assertEquals(subCount, 1);
        assertEquals(subCount2, 1);

        signal.value.set("baz", "boop");
        signal2.value.set("baz", "boop");
        assertEquals(signal.value, new Map([["foo", "bar"], ["baz", "boop"]]));
        assertEquals(signal2.value, new Map([["foo", "bar"], ["baz", "boop"]]));
        assertEquals(subCount, 1);
        assertEquals(subCount2, 2);

        signal.value.clear();
        signal2.value.clear();
        assertEquals(signal.value, new Map([]));
        assertEquals(signal.value, new Map([]));
        assertEquals(subCount, 2);
        assertEquals(subCount2, 3);

        signal.dispose();
        signal2.dispose();

        signal.value.set("foo", "bar");
        signal2.value.set("foo", "bar");
        assertEquals(subCount, 2); // doesn't run after being disposed
        assertEquals(subCount2, 3); // doesn't run after being disposed
      });

      await t.step("Set", () => {
        let subCount = 0;
        const signal = new Signal(new Set([1, 2, 3]), {
          deepObserve: true,
        });
        signal.subscribe(() => ++subCount);

        assertEquals(IS_REACTIVE in signal.value, true);
        assertEquals(subCount, 0);

        signal.value.add(4);
        assertEquals(signal.value, new Set([1, 2, 3, 4]));
        assertEquals(subCount, 1);

        signal.value.delete(4);
        assertEquals(signal.value, new Set([1, 2, 3]));
        assertEquals(subCount, 2);

        signal.value.clear();
        assertEquals(signal.value, new Set([]));
        assertEquals(subCount, 3);

        signal.dispose();

        signal.value.add(5);
        assertEquals(subCount, 3); // doesn't run after being disposed
      });
    });
  });

  await t.step("Computed", async () => {
    let subCount = 0;

    const signal = new Signal(0);
    const computed = new Computed(() => signal.value * 2);
    const computed2 = new Computed(() => computed.value * 2);

    computed.subscribe(() => ++subCount);

    // Computed tracks dependencies for one event loop tick
    await Promise.resolve();

    assertThrows(() => computed.value = 10); // You can't change computed's value directly

    assertEquals(signal.value, 0);
    assertEquals(computed.value, 0);
    assertEquals(computed2.value, 0);
    assertEquals(subCount, 0); // Subscribers get info after value being changed, unlike effect

    signal.value = 5;
    assertEquals(signal.value, 5);
    assertEquals(computed.value, 10);
    assertEquals(computed2.value, 20);
    assertEquals(subCount, 1);

    signal.value = 10;
    assertEquals(signal.value, 10);
    assertEquals(computed.value, 20);
    assertEquals(computed2.value, 40);
    assertEquals(subCount, 2);

    computed.dispose();
    signal.value = 15;

    assertEquals(signal.value, 15);
    assertEquals(computed.value, 20); // value doesn't change after being disposed
    assertEquals(computed2.value, 40); // value doesn't change after being disposed
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
    assertEquals(effect.dependencies.size, 2);
    assertArrayIncludes(Array.from(effect.dependencies), [signal2]);

    assertEquals(runs, 1);
    assertEquals(
      effectOutput,
      `s1:${1}, c1:${2} | s2: ${1}, c2:${3} | c3: ${6}`,
    );

    // When effect is paused it won't get called on signal changes
    effect.pause();
    signal.value = 6;
    signal2.value = 9;

    assertEquals(runs, 1);
    assertEquals(
      effectOutput,
      `s1:${1}, c1:${2} | s2: ${1}, c2:${3} | c3: ${6}`,
    );

    // When effect is resumed it will start running its callback again
    effect.resume();

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

    assertEquals(effect.dependencies.size, 1);
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
