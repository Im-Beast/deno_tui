// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { emptyStyle, Style, Theme } from "../theme.ts";

import { PlaceComponentOptions } from "../component.ts";
import { ViewComponent } from "./view.ts";
import { SliderComponent } from "./slider.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { clamp } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";

/** Theme used by {ScrollableView} to style itself */
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

/** Interface defining object that {ScrollableView}'s constructor can interpret */
export interface ScrollableViewComponentOptions extends PlaceComponentOptions {
  theme?: DeepPartial<ScrollableViewTheme>;
}

/** Complementary interface defining what's accessible in {SliderComponent} class in addition to {SliderComponentOptions} */
export interface ScrollableViewComponentPrivate {
  theme: ScrollableViewTheme;
  scrollbars: {
    vertical?: SliderComponent | undefined;
    horizontal?: SliderComponent | undefined;
  };
}

/** Implementation for {ScrollableViewComponent} class */
export type ScrollableViewComponentImplementation = ScrollableViewComponentPrivate & ScrollableViewComponentOptions;

/**
 * Component that can be assigned to other component's `view` property.
 * This allows components to be drawn independently from other components.
 * Components drawn over bounds of this component automatically adjust its offset, and when needed scrollbars are added.
 */
export class ScrollableViewComponent<
  EventMap extends Record<string, EmitterEvent> = Record<never, never>,
> extends ViewComponent<EventMap> implements ScrollableViewComponentImplementation {
  declare theme: ScrollableViewTheme;

  scrollbars: {
    vertical?: SliderComponent;
    horizontal?: SliderComponent;
  };

  constructor(options: ScrollableViewComponentOptions) {
    super(options);
    this.margin = { top: 0, left: 0, right: 0, bottom: 0 };

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

    this.scrollbars = {};

    this.on("mousePress", (mousePress) => {
      const { scroll, shift } = mousePress;
      if (!scroll) return;

      const { horizontal, vertical } = this.scrollbars;

      if (shift) {
        this.offset.x = clamp(this.offset.x + scroll, 0, this.maxOffset.x);
        if (horizontal) horizontal.value = this.offset.x;
      } else {
        this.offset.y = clamp(this.offset.y + scroll, 0, this.maxOffset.y);
        if (vertical) vertical.value = this.offset.y;
      }
    });

    const updateScrollbarOffsets = () => {
      const { horizontal, vertical } = this.scrollbars;

      if (horizontal) horizontal.max = this.maxOffset.x;
      if (vertical) vertical.max = this.maxOffset.y;
    };

    this.tui.on("addComponent", updateScrollbarOffsets);
    this.tui.on("removeComponent", updateScrollbarOffsets);
  }

  draw(): void {
    super.draw();

    const { tui, theme } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    if (this.maxOffset.x > 0 && !this.scrollbars.horizontal) {
      this.scrollbars.horizontal = new SliderComponent({
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

      this.scrollbars.horizontal.on("valueChange", (component) => {
        this.offset.x = component.value;
      });

      this.margin.right = 1;
      this.updateOffsets();
    } else if (this.maxOffset.x === 0 && this.scrollbars.horizontal) {
      this.scrollbars.horizontal.remove();
      delete this.scrollbars.horizontal;
      this.margin.right = 0;
      this.updateOffsets();
    }

    if (this.maxOffset.y > 0 && !this.scrollbars.vertical) {
      this.scrollbars.vertical = new SliderComponent({
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

      this.scrollbars.vertical.on("valueChange", (component) => {
        this.offset.y = component.value;
      });

      this.margin.bottom = 1;
      this.updateOffsets();
    } else if (this.maxOffset.y === 0 && this.scrollbars.vertical) {
      this.scrollbars.vertical.remove();
      delete this.scrollbars.vertical;
      this.margin.bottom = 0;
      this.updateOffsets();
    }

    if (this.maxOffset.x > 0 && this.maxOffset.y > 0) {
      const cornerStyle = theme.scrollbar.corner;
      canvas.draw(column + width - 1, row + height - 1, cornerStyle(" "));
    }
  }

  interact(method?: "keyboard" | "mouse") {
    if (method === "keyboard") return;
    this.state = "focused";
  }
}
