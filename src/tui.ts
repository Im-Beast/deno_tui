import { BoxObject, Canvas } from "./canvas/mod.ts";
import { Component } from "./component.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { InputEventRecord } from "./input_reader/mod.ts";
import { Style } from "./theme.ts";
import { Stdin, Stdout } from "./types.ts";
import { HIDE_CURSOR, SHOW_CURSOR, USE_PRIMARY_BUFFER, USE_SECONDARY_BUFFER } from "./utils/ansi_codes.ts";
import { SortedArray } from "./utils/sorted_array.ts";

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
  children: SortedArray<Component>;
  readonly components: Component[];
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
    this.components = [];
    this.children = new SortedArray();

    const updateCanvasSize = () => {
      const { canvas } = this;
      const { columns, rows } = Deno.consoleSize();

      if (canvas.size.columns !== columns || canvas.size.rows !== rows) {
        canvas.resize = true;
        canvas.size.columns = columns;
        canvas.size.rows = rows;
      }
    };

    updateCanvasSize();
    if (Deno.build.os === "windows") {
      this.canvas.on("render", updateCanvasSize);
    } else {
      Deno.addSignalListener("SIGWINCH", updateCanvasSize);
    }
  }

  addChildren(...children: Component[]): void {
    for (const child of children) {
      child.draw();
    }

    this.children.push(...children);
    this.components.push(...children);
  }

  run(): void {
    const { style, canvas, stdout, drawnObjects } = this;

    if (style) {
      const { background } = drawnObjects;

      background?.erase();

      const { columns, rows } = canvas.size;

      const backgroundRectangle = {
        column: 0,
        row: 0,
        width: columns,
        height: rows,
      };

      const box = new BoxObject({
        canvas,
        rectangle: () => {
          const { columns, rows } = this.canvas.size;
          backgroundRectangle.width = columns;
          backgroundRectangle.height = rows;
          return backgroundRectangle;
        },
        style,
        zIndex: -1,
      });

      drawnObjects.background = box;
      box.draw();
    }

    Deno.writeSync(stdout.rid, textEncoder.encode(USE_SECONDARY_BUFFER + HIDE_CURSOR));

    const updateStep = () => {
      for (const component of this.components) {
        if (!component.visible) continue;
        component.update();
      }

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
