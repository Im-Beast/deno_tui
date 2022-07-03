import { Component } from "../component.ts";
import { Rectangle } from "../types.ts";

export class BoxComponent extends Component {
  declare rectangle: Rectangle;

  draw() {
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    const color = this.style;

    const textRow = color(" ".repeat(width));

    for (let r = row; r < height; ++r) {
      canvas.draw(column, r, textRow);
    }
  }
}
