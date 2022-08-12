// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { ComponentOptions } from "../component.ts";
import { emptyStyle, Style, Theme } from "../theme.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { clamp } from "../utils/numbers.ts";
import { EventRecord } from "../utils/typed_event_target.ts";
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

export interface ScrollableViewComponentOptions extends ComponentOptions {
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

  constructor(options: ScrollableViewComponentOptions) {
    super(options);
    this.margin = {
      top: 0,
      left: 0,
      right: 1,
      bottom: 1,
    };

    const { theme } = options;

    const horizontal = theme?.scrollbar?.horizontal;

    const vertical = theme?.scrollbar?.vertical;
    const corner = theme?.scrollbar?.corner;
    this.theme.scrollbar = {
      horizontal: {
        track: horizontal?.track ?? emptyStyle,
        thumb: horizontal?.thumb ?? emptyStyle,
      },
      vertical: {
        track: vertical?.track ?? emptyStyle,
        thumb: vertical?.thumb ?? emptyStyle,
      },
      corner: corner ?? emptyStyle,
    };

    this.#scrollbars = {};

    this.tui.addEventListener("mousePress", ({ mousePress }) => {
      const { scroll, shift } = mousePress;
      if (!scroll || this.state === "base") return;

      const { horizontal, vertical } = this.#scrollbars;

      if (shift) {
        this.offset.x = clamp(this.offset.x + scroll, 0, this.maxOffset.x);
        if (horizontal) horizontal.value = this.offset.x;
      } else {
        this.offset.y = clamp(this.offset.y + scroll, 0, this.maxOffset.y);
        if (vertical) vertical.value = this.offset.y;
      }
    });

    this.tui.addEventListener(["addComponent", "removeComponent"], () => {
      const { horizontal, vertical } = this.#scrollbars;

      if (horizontal) horizontal.max = this.maxOffset.x;
      if (vertical) vertical.max = this.maxOffset.y;
    });
  }

  draw() {
    super.draw();

    const { tui, theme } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    if (this.maxOffset.x > 0 && !this.#scrollbars.horizontal) {
      this.#scrollbars.horizontal = new SliderComponent({
        tui,
        direction: "horizontal",
        min: 0,
        max: 0,
        value: 0,
        step: 1,
        rectangle: {
          column,
          width: width - 1,
          row: row + height - 1,
          height: 1,
        },
        theme: {
          base: theme.scrollbar.vertical.track,
          thumb: {
            base: theme.scrollbar.vertical.thumb,
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
        tui,
        direction: "vertical",
        min: 0,
        max: 0,
        value: 0,
        step: 1,
        rectangle: {
          column: column + width - 1,
          width: 1,
          height: height - 1,
          row,
        },
        theme: {
          base: theme.scrollbar.vertical.track,
          thumb: {
            base: theme.scrollbar.vertical.thumb,
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
      const cornerStyle = theme.scrollbar.corner;
      canvas.draw(column + width - 1, row + height - 1, cornerStyle(" "));
    }
  }

  interact() {
    this.state = "focused";
  }
}
