import { BoxObject } from "../canvas/box.ts";
import { Component } from "../component.ts";

export class Box extends Component {
  declare drawnObjects: { box: BoxObject };

  update(): void {
    super.update();

    const { box } = this.drawnObjects;

    box.style = this.style;
    box.rectangle = this.rectangle;
    box.zIndex = this.zIndex;
  }

  draw(): void {
    super.draw();

    const box = new BoxObject({
      canvas: this.tui.canvas,
      rectangle: this.rectangle,
      style: this.style,
      zIndex: this.zIndex,
    });

    this.drawnObjects.box = box;
    box.draw();
  }
}
