import { BoxObject } from "../canvas/box.ts";
import { Component } from "../component.ts";

export class Box extends Component {
  declare drawnObjects: { box: BoxObject };

  update(): void {
    super.update();
  }

  draw(): void {
    super.draw();

    const box = new BoxObject({
      canvas: this.tui.canvas,
      view: () => this.view,
      rectangle: () => this.rectangle,
      style: () => this.style,
      zIndex: () => this.zIndex,
    });

    this.drawnObjects.box = box;
    box.draw();
  }
}
