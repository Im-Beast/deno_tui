import { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { crayon } from "./deps.ts";
import type { Theme } from "./theme.ts";
import type { Stdin, Stdout } from "./types.ts";
import { Timing, TypedCustomEvent, TypedEventTarget } from "./util.ts";

interface TuiOptions {
  canvas?: Canvas;
  stdin?: Stdin;
  stdout?: Stdout;
  theme?: Partial<Theme>;
}

interface TuiPrivate {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  components: Component[];
}

type TuiImplementation = TuiOptions & TuiPrivate;

export class Tui extends TypedEventTarget<{
  render: {
    timing: Timing;
  };
  update: {
    timing: Timing;
  };
}> implements TuiImplementation {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  theme: Theme;
  components: Component[];

  constructor({ stdin, stdout, canvas, theme }: TuiOptions) {
    super();

    this.stdin = stdin ?? Deno.stdin;
    this.stdout = stdout ?? Deno.stdout;
    this.theme = {
      base: theme?.base ?? crayon,
      focused: theme?.focused ?? crayon,
      active: theme?.active ?? crayon,
    };
    this.components = [];
    this.canvas = canvas ?? new Canvas({
      size: { columns: 0, rows: 0 },
      refreshRate: 16,
      stdout: Deno.stdout,
    });
  }

  async *run() {
    for await (const timing of this.canvas.render()) {
      this.dispatchEvent(
        new TypedCustomEvent("render", { detail: { timing } }),
      );
      yield timing;

      if (timing === Timing.Post) {
        for (const component of this.components) {
          component.draw();
        }
      }
    }
  }
}
