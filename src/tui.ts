import { BoxObject, Canvas } from "./canvas/mod.ts";
import { Component } from "./component.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { Style } from "./theme.ts";
import { KeyPress, MousePress, MultiKeyPress, Stdin, Stdout } from "./types.ts";
import { HIDE_CURSOR, SHOW_CURSOR, USE_PRIMARY_BUFFER, USE_SECONDARY_BUFFER } from "./utils/ansi_codes.ts";

const textEncoder = new TextEncoder();

export interface TuiOptions {
  stdin?: Stdin;
  stdout?: Stdout;
  canvas?: Canvas;
  style?: Style;
}

export class Tui extends EventEmitter<{
  keyPress: EmitterEvent<[KeyPress]>;
  multiKeyPress: EmitterEvent<[MultiKeyPress]>;
  mousePress: EmitterEvent<[MousePress]>;
  destroy: EmitterEvent<[]>;
}> {
  stdin: Stdin;
  stdout: Stdout;
  canvas: Canvas;
  style?: Style;
  children: Component[];
  readonly components: Component[];
  drawnObjects: [background?: BoxObject];

  #nextUpdateTimeout?: number;

  constructor(options: TuiOptions) {
    super();
    this.stdin = options.stdin ?? Deno.stdin;
    this.stdout = options.stdout ?? Deno.stdout;

    this.canvas = options.canvas ?? new Canvas({
      refreshRate: 1000 / 60,
      stdout: this.stdout,
    });

    this.style = options.style;

    this.drawnObjects = [];
    this.components = [];
    this.children = [];

    Deno.addSignalListener("SIGWINCH", () => {
      const { columns, rows } = this.canvas.size = Deno.consoleSize();

      const [background] = this.drawnObjects;
      if (background) {
        background.rectangle.width = columns;
        background.rectangle.height = rows;
      }

      this.canvas.rerender();
    });
  }

  addChildren(...children: Component[]): void {
    for (const child of children) {
      child.draw();
    }

    this.children.push(...children);
    this.components.push(...children);
  }

  run(): void {
    const { style, canvas, stdout } = this;

    if (style) {
      const [background] = this.drawnObjects;

      if (background) {
        canvas.eraseObjects(background);
      }

      const { columns, rows } = canvas.size;

      const box = new BoxObject({
        rectangle: {
          column: 0,
          row: 0,
          width: columns,
          height: rows,
        },
        style,
        zIndex: -1,
      });

      this.drawnObjects[0] = box;
      this.canvas.drawObject(box);
    }

    Deno.writeSync(stdout.rid, textEncoder.encode(USE_SECONDARY_BUFFER + HIDE_CURSOR));
    const updateStep = () => {
      for (const component of this.components) {
        component.update();
      }
      canvas.render();
      this.#nextUpdateTimeout = setTimeout(updateStep, canvas.refreshRate);
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
