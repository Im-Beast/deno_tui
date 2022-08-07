import { ComponentOptions } from "../component.ts";
import { crayon } from "../deps.ts";
import { Style, Theme } from "../theme.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { clamp, EventRecord } from "../util.ts";
import { SliderComponent } from "./slider.ts";
import { ViewComponent } from "./view.ts";

export interface ScrollableViewTheme extends Theme {
  scrollbar: {
    horizontal: {
      track: Style;
      thumb: Style;
    };
    vertical: {
      track: Style;
      thumb: Style;
    };
    corner: Style;
  };
}

export interface ViewComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  theme?: DeepPartial<ScrollableViewTheme>;
}

export class ScrollableViewComponent<EventMap extends EventRecord = Record<never, never>>
  extends ViewComponent<EventMap> {
  declare rectangle: Rectangle;
  declare theme: ScrollableViewTheme;
  #scrollbars: {
    vertical?: SliderComponent;
    horizontal?: SliderComponent;
  };

  constructor(options: ViewComponentOptions) {
    super(options);

    const { theme } = options;

    const horizontal = theme?.scrollbar?.horizontal;

    const vertical = theme?.scrollbar?.vertical;
    const corner = theme?.scrollbar?.corner;
    this.theme.scrollbar = {
      horizontal: {
        track: horizontal?.track ?? crayon,
        thumb: horizontal?.thumb ?? crayon,
      },
      vertical: {
        track: vertical?.track ?? crayon,
        thumb: vertical?.thumb ?? crayon,
      },
      corner: corner ?? crayon,
    };

    this.#scrollbars = {};

    this.tui.addEventListener("mousePress", ({ mousePress }) => {
      const { scroll, shift } = mousePress;
      if (!scroll || this.state === "base") return;

      if (shift) {
        this.offset.x = clamp(this.offset.x + scroll, 0, this.maxOffset.x);
      } else {
        this.offset.y = clamp(this.offset.y + scroll, 0, this.maxOffset.y);
      }

      if (this.#scrollbars.horizontal) this.#scrollbars.horizontal.value = this.offset.x;
      if (this.#scrollbars.vertical) this.#scrollbars.vertical.value = this.offset.y;
    });

    this.tui.addEventListener(["addComponent", "removeComponent"], () => {
      if (this.#scrollbars.horizontal) this.#scrollbars.horizontal.max = this.maxOffset.x;
      if (this.#scrollbars.vertical) this.#scrollbars.vertical.max = this.maxOffset.y;
    });
  }

  draw() {
    super.draw();

    const { canvas } = this.tui.realTui;
    const { column, row, width, height } = this.rectangle;

    if (this.maxOffset.x > 0 && !this.#scrollbars.horizontal) {
      this.#scrollbars.horizontal = new SliderComponent({
        tui: this.tui.realTui,
        direction: "horizontal",
        min: 0,
        max: 0,
        value: 0,
        step: 1,
        rectangle: {
          column: column,
          row: row + height,
          height: 1,
          width: width,
        },
        theme: {
          base: this.theme.scrollbar.vertical.track,
          thumb: {
            base: this.theme.scrollbar.vertical.thumb,
          },
        },
      });

      this.#scrollbars.horizontal.addEventListener("valueChange", ({ component }) => {
        this.offset.x = component.value;
      });
    } else if (this.maxOffset.x === 0 && this.#scrollbars.horizontal) {
      this.#scrollbars.horizontal.remove();
      delete this.#scrollbars.horizontal;
    }

    if (this.maxOffset.y > 0 && !this.#scrollbars.vertical) {
      this.#scrollbars.vertical = new SliderComponent({
        tui: this.tui.realTui,
        direction: "vertical",
        min: 0,
        max: 0,
        value: 0,
        step: 1,
        rectangle: {
          column: column + width,
          row: row,
          height: height,
          width: 1,
        },
        theme: {
          base: this.theme.scrollbar.vertical.track,
          thumb: {
            base: this.theme.scrollbar.vertical.thumb,
          },
        },
      });

      this.#scrollbars.vertical!.addEventListener("valueChange", ({ component }) => {
        this.offset.y = component.value;
      });
    } else if (this.maxOffset.y === 0 && this.#scrollbars.vertical) {
      this.#scrollbars.vertical.remove();
      delete this.#scrollbars.vertical;
    }

    if (this.maxOffset.x > 0 && this.maxOffset.y > 0) {
      const cornerStyle = this.theme.scrollbar.corner;
      canvas.draw(column + width, row + height, cornerStyle(" "));
    }
  }

  interact() {
    this.state = "focused";
  }
}
