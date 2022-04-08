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
import {
  createComponent,
  ExtendedComponent,
  getCurrentStyler,
  removeComponent,
} from "../tui_component.ts";
import { Rectangle, TuiObject } from "../types.ts";
import { clamp, cloneAndAssign } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";
import {
  createSlider,
  CreateSliderOptions,
  SliderComponent,
} from "./slider.ts";

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

  let scrollbarX: SliderComponent | undefined;
  let scrollbarY: SliderComponent | undefined;

  let offsetX = 0;
  let offsetY = 0;

  let maxComponentOffsetX = 0;
  let maxComponentOffsetY = 0;

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
        if (!viewCanvas) return;

        render(viewCanvas);

        const { width, height } = this.rectangle;
        const { styler, rectangle } = this;

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

        if (maxOffsetY > 0 && !scrollbarY) {
          scrollbarY = createSlider(
            scrollableView,
            cloneAndAssign<CreateScrollableViewOptions, CreateSliderOptions>(
              options,
              {
                get rectangle() {
                  const { column, row, width, height } =
                    scrollableView.rectangle;
                  return {
                    column: column + width,
                    row: row,
                    height: height,
                    width: 1,
                  };
                },
                direction: "vertical",
                min: 0,
                step: 1,
                get value() {
                  return offsetY;
                },
                set value(v) {
                  offsetY = v;
                },
                get max() {
                  return maxOffsetY;
                },
                get styler(): CreateSliderOptions["styler"] {
                  const styler = getCurrentStyler(scrollableView).vertical;
                  return {
                    ...styler?.track,
                    thumb: styler?.thumb,
                  };
                },
              },
            ),
          );
        } else if (scrollbarY && !maxOffsetY) {
          removeComponent(scrollbarY);
          scrollbarY = undefined;
        }

        if (maxOffsetX > 0 && !scrollbarX) {
          scrollbarX = createSlider(
            scrollableView,
            cloneAndAssign<CreateScrollableViewOptions, CreateSliderOptions>(
              options,
              {
                get rectangle() {
                  const { column, row, width, height } =
                    scrollableView.rectangle;
                  return {
                    column: column,
                    row: row + height,
                    height: 1,
                    width: width,
                  };
                },
                direction: "horizontal",
                min: 0,
                step: 1,
                get value() {
                  return offsetX;
                },
                set value(v) {
                  offsetX = v;
                },
                get max() {
                  return maxOffsetX;
                },
                get styler(): CreateSliderOptions["styler"] {
                  const styler = getCurrentStyler(scrollableView).vertical;
                  return {
                    ...styler?.track,
                    thumb: styler?.thumb,
                  };
                },
              },
            ),
          );
        } else if (scrollbarX && !maxOffsetX) {
          removeComponent(scrollbarX);
          scrollbarX = undefined;
        }

        if (maxOffsetX > 0 && maxOffsetY > 0) {
          drawPixel(parent.canvas, {
            column: rectangle.column + rectangle.width,
            row: rectangle.row + rectangle.height,
            styler: options.styler?.corner,
            value: "+",
          });
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

  scrollableView.tui.on("draw", () => {
    render(viewCanvas);

    maxOffsetX = maxComponentOffsetX - scrollableView.rectangle.width;
    maxOffsetY = maxComponentOffsetY - scrollableView.rectangle.height;
  });

  scrollableView.on("mouse", ({ shift, scroll }) => {
    if (shift) {
      offsetX = clamp(offsetX + scroll, 0, maxOffsetX);
    } else {
      offsetY = clamp(offsetY + scroll, 0, maxOffsetY);
    }
  });

  scrollableView.on("createComponent", (component) => {
    if (component === scrollbarX || component === scrollbarY) return;

    originalRectangles.set(component.id, component.rectangle);
    component.canvas = viewCanvas;

    const reachX = (component.rectangle.column + component.rectangle.width + 1);
    maxOffsetX = Math.max(
      reachX -
        scrollableView.rectangle.width,
      maxOffsetX,
    );
    if (maxComponentOffsetX < reachX) maxComponentOffsetX = reachX;

    const reachY = (component.rectangle.row + component.rectangle.height + 1);
    maxOffsetY = Math.max(
      reachY - scrollableView.rectangle.height,
      maxOffsetY,
    );
    if (maxComponentOffsetY < reachY) maxComponentOffsetY = reachY;
  });

  scrollableView.on("removeComponent", (component) => {
    originalRectangles.delete(component.id);
  });

  return scrollableView;
}
