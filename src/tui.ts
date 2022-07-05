import { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { crayon } from "./deps.ts";
import { KeyPress, MousePress, MultiKeyPress } from "./key_reader.ts";
import type { Theme } from "./theme.ts";
import type { Stdin, Stdout } from "./types.ts";
import {
  sleep,
  SortedArray,
  Timing,
  TypedCustomEvent,
  TypedEventTarget,
} from "./util.ts";
import { MuxAsyncIterator } from "https://deno.land/std/async/mux_async_iterator.ts";

interface TuiOptions {
  canvas?: Canvas;
  stdin?: Stdin;
  stdout?: Stdout;
  theme?: Partial<Theme>;
  updateRate?: number;
}

interface TuiPrivate {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  components: SortedArray<Component>;
  updateRate: number;
}

type TuiImplementation = TuiOptions & TuiPrivate;

export class Tui extends TypedEventTarget<{
  render: {
    timing: Timing;
  };
  update: void;
  keyPress: KeyPress;
  multiKeyPress: MultiKeyPress;
  mousePress: MousePress;
}> implements TuiImplementation {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  theme: Theme;
  components: SortedArray<Component>;
  updateRate: number;

  constructor({ stdin, stdout, canvas, theme, updateRate }: TuiOptions) {
    super();

    this.stdin = stdin ?? Deno.stdin;
    this.stdout = stdout ?? Deno.stdout;
    this.theme = {
      base: theme?.base ?? crayon,
      focused: theme?.focused ?? theme?.base ?? crayon,
      active: theme?.active ?? theme?.focused ?? theme?.base ?? crayon,
    };
    this.components = new SortedArray<Component>((a, b) => a.zIndex - b.zIndex);

    this.canvas = canvas ?? new Canvas({
      size: { columns: 0, rows: 0 },
      refreshRate: 16,
      stdout: Deno.stdout,
    });
    this.updateRate = updateRate ?? this.canvas.refreshRate;
  }

  async *update(): AsyncGenerator<{ type: "update" }> {
    while (true) {
      let deltaTime = performance.now();

      this.dispatchEvent(
        new TypedCustomEvent("update"),
      );
      yield { type: "update" };

      deltaTime -= performance.now();
      await sleep(this.updateRate + (deltaTime / 2));
    }
  }

  async *render(): AsyncGenerator<{ type: "render"; timing: Timing }> {
    for await (const timing of this.canvas.render()) {
      this.dispatchEvent(
        new TypedCustomEvent("render", { detail: { timing } }),
      );
      yield { type: "render", timing };
    }
  }

  async *run(): AsyncGenerator<
    { type: "render"; timing: Timing } | { type: "update" }
  > {
    const iterator = new MuxAsyncIterator<
      { type: "render"; timing: Timing } | { type: "update" }
    >();
    iterator.add(this.render());
    iterator.add(this.update());

    for await (const event of iterator) {
      yield event;

      for (const component of this.components) {
        component.draw();
      }
    }
  }
}
