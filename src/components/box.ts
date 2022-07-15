import {
  Component,
  ComponentEventMap,
  ComponentOptions,
} from "../component.ts";
import { Rectangle } from "../types.ts";

export interface BoxComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
}

export class BoxComponent<
  EventMap extends ComponentEventMap = ComponentEventMap,
> extends Component<EventMap> {
  declare rectangle: Rectangle;

  constructor(options: BoxComponentOptions) {
    super(options);
  }

  draw() {
    super.draw();

    const { style } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    const textRow = style(" ".repeat(width));

    for (let r = row; r < row + height; ++r) {
      canvas.draw(column, r, textRow);
    }
  }
}
