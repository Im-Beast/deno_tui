import { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { crayon } from "./deps.ts";
import { KeyPress, MousePress, MultiKeyPress } from "./key_reader.ts";
import type { Style } from "./theme.ts";
import type { Stdin, Stdout } from "./types.ts";
import {
  CombinedAsyncIterator,
  sleep,
  SortedArray,
  Timing,
  TypedCustomEvent,
  TypedEventTarget,
} from "./util.ts";

interface TuiOptions {
  canvas?: Canvas;
  stdin?: Stdin;
  stdout?: Stdout;
  style?: Style;
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
  close: void;
}> implements TuiImplementation {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  style: Style;
  components: SortedArray<Component>;
  updateRate: number;

  constructor({ stdin, stdout, canvas, style, updateRate }: TuiOptions) {
    super();

    addEventListener("unload", () => {
      this.dispatchEvent(new TypedCustomEvent("close"));
    });

    Deno.addSignalListener("SIGINT", () => {
      this.dispatchEvent(new TypedCustomEvent("close"));
    });

    this.stdin = stdin ?? Deno.stdin;
    this.stdout = stdout ?? Deno.stdout;
    this.style = style ?? crayon;
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
      if (timing === Timing.Post) {
        const { columns, rows } = this.canvas.size;
        const textRow = this.style(" ".repeat(columns));
        for (let r = 0; r < rows; ++r) {
          this.canvas.draw(0, r, textRow);
        }
      }

      this.dispatchEvent(
        new TypedCustomEvent("render", { detail: { timing } }),
      );
      yield { type: "render", timing };
    }
  }

  async *run(): AsyncGenerator<
    | { type: "render"; timing: Timing }
    | { type: "update" }
  > {
    const iterator = new CombinedAsyncIterator<
      { type: "render"; timing: Timing } | { type: "update" }
    >(this.update(), this.render());

    for await (const event of iterator) {
      yield event;

      if (event.type === "update") {
        for (const component of this.components) {
          component.draw();
        }
      }
    }
  }
}
