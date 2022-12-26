import { Component } from "./component.ts";
import { Slider, SliderTheme } from "./components/slider.ts";
import { EventRecord } from "./event_emitter.ts";
import { Tui } from "./tui.ts";
import { DeepPartial, Offset, Rectangle } from "./types.ts";
import { SortedArray } from "./utils/sorted_array.ts";

export const viewInstances: View[] = [];

export interface ViewTheme {
  sliders:
    | DeepPartial<
      SliderTheme
    >
    | {
      horizontal: DeepPartial<SliderTheme>;
      vertical: DeepPartial<SliderTheme>;
    };
}

export interface ViewOptions {
  tui: Tui;
  title: string;
  rectangle: Rectangle;
  scrollable: boolean;
  theme: ViewTheme;
}

export class View {
  tui: Tui;
  title: string;
  components: SortedArray<Component<EventRecord>>;
  rectangle: Rectangle;
  scrollable: boolean;
  offset: Offset;
  maxOffset: Offset;
  theme: ViewTheme;
  scrollbars: {
    horizontal?: Slider;
    vertical?: Slider;
  };

  constructor(options: ViewOptions) {
    this.tui = options.tui;
    this.title = options.title;
    this.components = new SortedArray((a, b) => a.zIndex - b.zIndex);
    this.rectangle = options.rectangle;
    this.scrollable = options.scrollable;
    this.scrollbars = {};
    this.theme = options.theme;

    this.offset = { x: 0, y: 0 };
    this.maxOffset = { x: 0, y: 0 };

    viewInstances.push(this);
  }

  updateOffsets(): void {
    // queueMicrotask is neccesary, if rectangle property is accessed too fast it may crash
    queueMicrotask(() => {
      for (const component of this.components) {
        const rectangle = component.rectangle;
        if (!rectangle) continue;
        this.maxOffset.x = Math.max(this.maxOffset.x, rectangle.column + rectangle.width - this.rectangle.width);
        this.maxOffset.y = Math.max(this.maxOffset.y, rectangle.row + rectangle.height - this.rectangle.height);
      }

      this.updateScrollbars();
    });
  }

  updateScrollbars(): void {
    // Remove scrollbars if not scrollable
    if (!this.scrollable) {
      const { horizontal, vertical } = this.scrollbars;
      if (horizontal) horizontal.remove();
      if (vertical) vertical.remove();
      this.scrollbars = {};
      return;
    }

    // Create scrollbars
    ((self: View) => {
      let horizontalTheme!: DeepPartial<SliderTheme>;
      let verticalTheme!: DeepPartial<SliderTheme>;

      if ("vertical" in self.theme.sliders) {
        horizontalTheme = self.theme.sliders.horizontal;
        verticalTheme = self.theme.sliders.vertical;
      } else {
        horizontalTheme = verticalTheme = self.theme.sliders;
      }

      if (this.maxOffset.x > 0 && !this.scrollbars.horizontal) {
        this.scrollbars.horizontal = new Slider({
          tui: this.tui,
          direction: "horizontal",
          min: 0,
          max: 0,
          value: 0,
          get rectangle() {
            const { column, width, row } = self.rectangle;
            return {
              column,
              row: row - 1,
              height: 1,
              width,
            };
          },
          step: 1,
          adjustThumbSize: true,
          theme: horizontalTheme,
          zIndex: Number.MAX_SAFE_INTEGER,
        });

        this.scrollbars.horizontal.on("valueChange", (component) => {
          this.offset.x = component.value;
        });
      }

      if (this.maxOffset.y > 0 && !this.scrollbars.vertical) {
        this.scrollbars.vertical = new Slider({
          tui: this.tui,
          direction: "vertical",
          min: 0,
          max: 0,
          value: 0,
          get rectangle() {
            const { column, width, row, height } = self.rectangle;
            return {
              column: column + width,
              row,
              height,
              width: 1,
            };
          },
          step: 1,
          adjustThumbSize: true,
          theme: verticalTheme,
          zIndex: Number.MAX_SAFE_INTEGER,
        });

        this.scrollbars.vertical.on("valueChange", (component) => {
          this.offset.y = component.value;
        });
      }
    })(this);

    if (this.scrollbars.vertical) {
      this.scrollbars.vertical.max = this.maxOffset.y;
    }

    if (this.scrollbars.horizontal) {
      this.scrollbars.horizontal.max = this.maxOffset.x;
    }
  }
}
