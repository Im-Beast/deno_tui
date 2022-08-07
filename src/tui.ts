import { SHOW_CURSOR } from "./ansi_codes.ts";
import { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { crayon } from "./deps.ts";
import { ComponentEvent, KeypressEvent, MousePressEvent, MultiKeyPressEvent, RenderEvent } from "./events.ts";
import type { Style } from "./theme.ts";
import type { Stdin, Stdout } from "./types.ts";

import { CombinedAsyncIterator } from "./utils/combined_async_iterator.ts";
import { sleep } from "./utils/async.ts";
import { SortedArray } from "./utils/sorted_array.ts";
import { Timing } from "./types.ts";
import { TypedEventTarget } from "./utils/typed_event_target.ts";

const textEncoder = new TextEncoder();

export interface TuiOptions {
  canvas?: Canvas;
  stdin?: Stdin;
  stdout?: Stdout;
  style?: Style;
  updateRate?: number;
}

export interface TuiPrivate {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  components: SortedArray<Component>;
  updateRate: number;
}

export type TuiImplementation = TuiOptions & TuiPrivate;

export type TuiEventMap = {
  render: RenderEvent;
  update: Event;
  keyPress: KeypressEvent;
  multiKeyPress: MultiKeyPressEvent;
  mousePress: MousePressEvent;
  close: CustomEvent<"close">;
  addComponent: ComponentEvent<"addComponent">;
  removeComponent: ComponentEvent<"removeComponent">;
};

export class Tui extends TypedEventTarget<TuiEventMap> implements TuiImplementation {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  style: Style;
  components: SortedArray<Component>;
  updateRate: number;

  constructor({ stdin, stdout, canvas, style, updateRate }: TuiOptions) {
    super();

    addEventListener("unload", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    Deno.addSignalListener("SIGINT", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    if (Deno.build.os === "windows") {
      this.addEventListener("keyPress", ({ keyPress }) => {
        const { key, ctrl } = keyPress;
        if (key === "c" && ctrl) this.dispatchEvent(new CustomEvent("close"));
      });
    }

    this.addEventListener("close", () => {
      Deno.writeSync(this.stdout.rid, textEncoder.encode(SHOW_CURSOR));

      queueMicrotask(() => {
        Deno.exit(0);
      });
    });

    this.stdin = stdin ?? Deno.stdin;
    this.stdout = stdout ?? Deno.stdout;
    this.style = style ?? crayon;
    this.components = new SortedArray((a, b) => a.zIndex - b.zIndex);

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

      this.dispatchEvent(new CustomEvent("update"));
      yield { type: "update" };

      deltaTime -= performance.now();
      await sleep(this.updateRate + (deltaTime / 2));
    }
  }

  async *render(): AsyncGenerator<{ type: "render"; timing: Timing }> {
    for await (const timing of this.canvas.render()) {
      if (timing === Timing.Post) {
        const { columns, rows } = this.canvas.size;

        this.canvas.draw(
          0,
          0,
          this.style(
            (" ".repeat(columns) + "\n").repeat(rows),
          ),
        );
      }

      this.dispatchEvent(new CustomEvent("render", { detail: { timing } }));
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
      if (event.type === "update") {
        for (const component of this.components) {
          component.draw();
        }
      }

      yield event;
    }
  }
}
