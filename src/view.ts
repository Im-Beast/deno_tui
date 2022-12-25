import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";
import { Component } from "./component.ts";
import { Slider } from "./components/slider.ts";
import { EventRecord } from "./event_emitter.ts";
import { Tui } from "./tui.ts";
import { Offset, Rectangle } from "./types.ts";
import { SortedArray } from "./utils/sorted_array.ts";

export const viewInstances: View[] = [];

export interface ViewOptions {
  tui: Tui;
  title: string;
  rectangle: Rectangle;
  scrollable: boolean;
}

export class View {
  tui: Tui;
  title: string;
  components: SortedArray<Component<EventRecord>>;
  rectangle: Rectangle;
  scrollable: boolean;
  offset: Offset;
  maxOffset: Offset;
  scrollbars: {
    horizontal: Slider;
    vertical: Slider;
  };

  constructor(options: ViewOptions) {
    this.tui = options.tui;
    this.title = options.title;
    this.components = new SortedArray((a, b) => a.zIndex - b.zIndex);
    this.rectangle = options.rectangle;
    this.scrollable = options.scrollable;

    this.offset = { x: 0, y: 0 };
    this.maxOffset = { x: 0, y: 0 };

    viewInstances.push(this);

    const { column, row, width, height } = this.rectangle;

    this.scrollbars = {
      vertical: new Slider({
        tui: this.tui,
        direction: "vertical",
        min: 0,
        max: this.maxOffset.y,
        value: this.offset.y,
        rectangle: {
          column: column + width,
          row,
          height,
          width: 1,
        },
        step: 1,
        adjustThumbSize: true,
        theme: {
          base: crayon.bgYellow,
        },
      }),
      horizontal: new Slider({
        tui: this.tui,
        direction: "horizontal",
        min: 0,
        max: this.maxOffset.x,
        value: this.offset.x,
        rectangle: {
          column,
          row: row - 1,
          height: 1,
          width,
        },
        step: 1,
        adjustThumbSize: true,
        theme: {
          base: crayon.bgYellow,
        },
      }),
    };
  }
}
