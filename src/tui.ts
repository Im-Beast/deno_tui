// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { BoxObject, Canvas } from "./canvas/mod.ts";
import { Component } from "./component.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { InputEventRecord } from "./input_reader/mod.ts";
import { Computed } from "./signals.ts";
import { Style } from "./theme.ts";
import { Stdin, Stdout } from "./types.ts";
import { HIDE_CURSOR, SHOW_CURSOR, USE_PRIMARY_BUFFER, USE_SECONDARY_BUFFER } from "./utils/ansi_codes.ts";

const textEncoder = new TextEncoder();

export interface TuiOptions {
  style?: Style;
  stdin?: Stdin;
  stdout?: Stdout;
  canvas?: Canvas;
  refreshRate?: number;
}

export class Tui extends EventEmitter<
  {
    destroy: EmitterEvent<[]>;
  } & InputEventRecord
> {
  stdin: Stdin;
  stdout: Stdout;
  canvas: Canvas;
  style?: Style;
  children: Component[];
  components: Set<Component>;
  focusedComponents: Set<Component>;
  drawnObjects: { background?: BoxObject };
  refreshRate: number;

  #nextUpdateTimeout?: number;

  constructor(options: TuiOptions) {
    super();
    this.stdin = options.stdin ?? Deno.stdin;
    this.stdout = options.stdout ?? Deno.stdout;
    this.refreshRate = options.refreshRate ?? 1000 / 60;
    this.canvas = options.canvas ?? new Canvas({
      stdout: this.stdout,
      size: Deno.consoleSize(),
    });

    this.style = options.style;

    this.drawnObjects = {};
    this.components = new Set();
    this.focusedComponents = new Set();
    this.children = [];

    const updateCanvasSize = () => {
      const { canvas } = this;
      const { columns, rows } = Deno.consoleSize();

      const size = canvas.size.peek();

      if (size.columns !== columns || size.rows !== rows) {
        canvas.resize = true;
        size.columns = columns;
        size.rows = rows;
      }
    };

    updateCanvasSize();
    if (Deno.build.os === "windows") {
      this.canvas.on("render", updateCanvasSize);
    } else {
      Deno.addSignalListener("SIGWINCH", updateCanvasSize);
    }
  }

  addChild(child: Component): void {
    this.children.push(child);
    this.components.add(child);

    if (!child.visible.peek()) return;
    child.draw();
  }

  run(): void {
    const { style, canvas, stdout, drawnObjects } = this;

    if (style) {
      const { background } = drawnObjects;

      background?.erase();

      const { columns, rows } = canvas.size.peek();

      const backgroundRectangle = {
        column: 0,
        row: 0,
        width: columns,
        height: rows,
      };

      const box = new BoxObject({
        canvas,
        rectangle: new Computed(() => {
          const { columns, rows } = this.canvas.size.value;
          backgroundRectangle.width = columns;
          backgroundRectangle.height = rows;
          return backgroundRectangle;
        }),
        style,
        zIndex: -1,
      });

      drawnObjects.background = box;
      box.draw();
    }

    Deno.writeSync(stdout.rid, textEncoder.encode(USE_SECONDARY_BUFFER + HIDE_CURSOR));

    for (const event of ["keyPress", "mouseEvent", "mousePress", "mouseScroll"] as const) {
      this.on(event, (arg) => {
        for (const component of this.focusedComponents) {
          // @ts-expect-error welp
          component.emit(event, arg);
        }
      });
    }

    const updateStep = () => {
      canvas.render();
      this.#nextUpdateTimeout = setTimeout(updateStep, this.refreshRate);
    };
    updateStep();
  }

  destroy(): void {
    this.off();

    clearTimeout(this.#nextUpdateTimeout);

    try {
      this.stdin.setRaw(false);
    } catch { /**/ }

    Deno.writeSync(this.stdout.rid, textEncoder.encode(USE_PRIMARY_BUFFER + SHOW_CURSOR));

    for (const component of this.components) {
      component.remove();
    }
  }

  dispatch(): void {
    const destroyDispatcher = () => {
      this.emit("destroy");
    };

    if (Deno.build.os === "windows") {
      Deno.addSignalListener("SIGBREAK", destroyDispatcher);

      this.on("keyPress", ({ key, ctrl }) => {
        if (ctrl && key === "c") destroyDispatcher();
      });
    } else {
      Deno.addSignalListener("SIGTERM", destroyDispatcher);
    }

    Deno.addSignalListener("SIGINT", destroyDispatcher);

    this.on("destroy", () => {
      this.destroy();
      queueMicrotask(() => Deno.exit(0));
    });
  }
}
