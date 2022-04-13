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
    offsetX: number;
    offsetY: number;
    maxOffsetX: number;
    maxOffsetY: number;
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

  let maxComponentOffsetX = 0;
  let maxComponentOffsetY = 0;

  const originalRectangles = new Map<number, Rectangle>();
  const scrollableView: ScrollableViewComponent = createComponent(
    parent,
    options,
    {
      name: "scrollableView",
      interactive: true,
      offsetX: 0,
      offsetY: 0,
      maxOffsetX: 0,
      maxOffsetY: 0,
      drawPriority: -1,
      update(this: ScrollableViewComponent) {
        scrollableView.focusedWithin.splice(
          0,
          scrollableView.focusedWithin.length,
          ...scrollableView.children,
        );
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

        if (this.maxOffsetX > 0 && this.maxOffsetY > 0) {
          drawPixel(parent.canvas, {
            column: rectangle.column + rectangle.width,
            row: rectangle.row + rectangle.height,
            styler: options.styler?.corner,
            value: "+",
          });
        }

        if (scrollableView.maxOffsetY > 0 && !scrollbarY) {
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
                  return scrollableView.offsetY;
                },
                set value(v) {
                  scrollableView.offsetY = v;
                },
                get max() {
                  return scrollableView.maxOffsetY;
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
        } else if (scrollbarY && !scrollableView.maxOffsetY) {
          removeComponent(scrollbarY);
          scrollbarY = undefined;
        }

        if (scrollableView.maxOffsetX > 0 && !scrollbarX) {
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
                  return scrollableView.offsetX;
                },
                set value(v) {
                  scrollableView.offsetX = v;
                },
                get max() {
                  return scrollableView.maxOffsetX;
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
        } else if (scrollbarX && !this.maxOffsetX) {
          removeComponent(scrollbarX);
          scrollbarX = undefined;
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
    scrollableView.maxOffsetX = maxComponentOffsetX -
      scrollableView.rectangle.width;

    scrollableView.offsetX = scrollableView.maxOffsetX > 0
      ? clamp(
        scrollableView.offsetX,
        0,
        scrollableView.maxOffsetX,
      )
      : 0;

    scrollableView.maxOffsetY = maxComponentOffsetY -
      scrollableView.rectangle.height;

    scrollableView.offsetY = scrollableView.maxOffsetY > 0
      ? clamp(
        scrollableView.offsetY,
        0,
        scrollableView.maxOffsetY,
      )
      : 0;

    render(viewCanvas);
  });

  // Maybe just jump to the component when its focused? 🤔
  // Or implement command mode à la Vi?
  scrollableView.on("key", ({ key }) => {
    switch (key) {
      case "pagedown":
        scrollableView.offsetY = clamp(
          scrollableView.offsetY + ~~(scrollableView.rectangle.height * 0.5),
          0,
          scrollableView.maxOffsetY,
        );

        break;
      case "pageup":
        scrollableView.offsetY = clamp(
          scrollableView.offsetY - ~~(scrollableView.rectangle.height * 0.5),
          0,
          scrollableView.maxOffsetY,
        );
        break;
      case "home":
        scrollableView.offsetX = clamp(
          scrollableView.offsetX - ~~(scrollableView.rectangle.width * 0.5),
          0,
          scrollableView.maxOffsetX,
        );
        break;
      case "end":
        scrollableView.offsetX = clamp(
          scrollableView.offsetX + ~~(scrollableView.rectangle.width * 0.5),
          0,
          scrollableView.maxOffsetX,
        );
        break;
    }
  });

  scrollableView.on("mouse", ({ shift, scroll }) => {
    if (shift && scrollableView.maxOffsetX > 0) {
      scrollableView.offsetX = clamp(
        scrollableView.offsetX + scroll,
        0,
        scrollableView.maxOffsetX,
      );
    } else if (!shift && scrollableView.maxOffsetY > 0) {
      scrollableView.offsetY = clamp(
        scrollableView.offsetY + scroll,
        0,
        scrollableView.maxOffsetY,
      );
    }
  });

  scrollableView.on("createComponent", (component) => {
    if (component === scrollbarX || component === scrollbarY) return;

    const { rectangle } = component;
    Object.defineProperty(component, "rectangle", {
      get() {
        return {
          row: rectangle.row - scrollableView.offsetY,
          column: rectangle.column - scrollableView.offsetX,
          width: rectangle.width,
          height: rectangle.height,
        };
      },
    });

    component.canvas = viewCanvas;

    const reachX = (rectangle.column + rectangle.width + 1);
    scrollableView.maxOffsetX = Math.max(
      reachX -
        scrollableView.rectangle.width,
      scrollableView.maxOffsetX,
    );
    if (maxComponentOffsetX < reachX) {
      maxComponentOffsetX = reachX;
    }

    const reachY = (rectangle.row + rectangle.height + 1);
    scrollableView.maxOffsetY = Math.max(
      reachY - scrollableView.rectangle.height,
      scrollableView.maxOffsetY,
    );
    if (maxComponentOffsetY < reachY) {
      maxComponentOffsetY = reachY;
    }
  });

  scrollableView.on("removeComponent", (component) => {
    Object.defineProperty(component, "rectangle", {
      value: originalRectangles.get(component.id),
    });
  });

  return scrollableView;
}
