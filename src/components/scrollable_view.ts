// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  CanvasStyler,
  CompileStyler,
  createCanvas,
  drawPixel,
  drawRectangle,
  render,
} from "../canvas.ts";
import { TuiStyler } from "../tui.ts";
import { createComponent, ExtendedComponent } from "../tui_component.ts";
import { Rectangle, TuiObject } from "../types.ts";
import { clamp } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";

/** Definition on how ScrollableViewComponent should look like */
export type ScrollableViewStyler = TuiStyler & {
  vertical?: {
    track?: CanvasStyler;
    thumb?: CanvasStyler;
  };
  horizontal?: {
    track?: CanvasStyler;
    thumb?: CanvasStyler;
  };
  corner?: CanvasStyler;
};

/** Interactive ScrollableView component */
export type ScrollableViewComponent = ExtendedComponent<
  "scrollableView",
  {
    /** Definition on how component looks like */
    styler?: CompileStyler<ScrollableViewStyler>;
  }
>;

export interface CreateScrollableViewOptions extends CreateBoxOptions {
  styler?: CompileStyler<ScrollableViewStyler>;
}

/**
 * Create ScrollableView
 *
 * It is interactive by default
 * @param parent - parent of the created scrollable view, either tui or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * createScrollableView(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  },
 * });
 * ```
 */
export function createScrollableView(
  parent: TuiObject,
  options: CreateScrollableViewOptions,
): ScrollableViewComponent {
  const { canvas } = parent;

  let offsetX = 0;
  let offsetY = 0;

  let maxOffsetX = 0;
  let maxOffsetY = 0;

  const originalRectangles = new Map<number, Rectangle>();
  const scrollableView: ScrollableViewComponent = createComponent(
    parent,
    options,
    {
      name: "scrollableView",
      interactive: true,
      update(this: ScrollableViewComponent) {
        for (const child of this.children) {
          const originRect = originalRectangles.get(child.id);
          if (!originRect) continue;

          Reflect.set(child, "rectangle", {
            row: originRect.row - offsetY,
            column: originRect.column - offsetX,
            width: originRect.width,
            height: originRect.height,
          });
        }
      },
      draw(this: ScrollableViewComponent) {
        if (viewCanvas) {
          render(viewCanvas);

          const { width, height } = scrollableView.rectangle;
          const { styler } = scrollableView;

          drawRectangle(viewCanvas, {
            column: 0,
            row: 0,
            width: width,
            height: height,
            styler,
          });
          drawRectangle(parent.canvas, {
            ...scrollableView.rectangle,
            styler,
          });

          if (maxOffsetX > 0) {
            drawRectangle(parent.canvas, {
              column: this.rectangle.column,
              row: this.rectangle.row + this.rectangle.height,
              width: this.rectangle.width,
              height: 1,
              styler: options.styler?.horizontal?.track,
            });

            drawRectangle(parent.canvas, {
              column: this.rectangle.column +
                ~~((offsetX / maxOffsetX) * (this.rectangle.width - 1)),
              row: this.rectangle.row + this.rectangle.height,
              width: 1,
              height: 1,
              styler: options.styler?.horizontal?.thumb,
            });
          }

          if (maxOffsetY > 0) {
            drawRectangle(parent.canvas, {
              column: this.rectangle.column + this.rectangle.width,
              row: this.rectangle.row,
              width: 1,
              height: this.rectangle.height,
              styler: options.styler?.vertical?.track,
            });

            drawRectangle(parent.canvas, {
              column: this.rectangle.column + this.rectangle.width,
              row: this.rectangle.row +
                ~~((offsetY / maxOffsetY) * (this.rectangle.height - 1)),
              width: 1,
              height: 1,
              styler: options.styler?.vertical?.thumb,
            });
          }

          if (maxOffsetX > 0 && maxOffsetY > 0) {
            drawPixel(parent.canvas, {
              column: this.rectangle.column + this.rectangle.width,
              row: this.rectangle.row + this.rectangle.height,
              styler: options.styler?.corner,
              value: "+",
            });
          }
        }
      },
    },
  );

  const viewCanvas = createCanvas({
    filler: canvas.filler,
    writer: canvas.writer,
    size() {
      const { width, height } = scrollableView.rectangle;
      const { columns, rows } = parent.canvas.size;
      return {
        columns: Math.min(width, columns),
        rows: Math.min(height, rows),
      };
    },
    offset() {
      const { column, row } = scrollableView.rectangle;
      return {
        columns: column,
        rows: row,
      };
    },
    smartRender: parent.canvas.smartRender,
  });

  scrollableView.tui.on("draw", () => render(viewCanvas));

  scrollableView.on("mouse", ({ shift, scroll }) => {
    if (shift) {
      offsetX = clamp(offsetX + scroll, 0, maxOffsetX);
    } else {
      offsetY = clamp(offsetY + scroll, 0, maxOffsetY);
    }
  });

  scrollableView.on("createComponent", (component) => {
    originalRectangles.set(component.id, component.rectangle);
    component.canvas = viewCanvas;

    // TODO: Recalculate offsets on window resize
    maxOffsetY = Math.max(
      (component.rectangle.row + component.rectangle.height + 1) -
        scrollableView.rectangle.height,
      maxOffsetY,
    );

    maxOffsetX = Math.max(
      (component.rectangle.column + component.rectangle.width + 1) -
        scrollableView.rectangle.width,
      maxOffsetX,
    );
  });

  scrollableView.on("removeComponent", (component) => {
    originalRectangles.delete(component.id);
  });

  return scrollableView;
}
