import { BoxObject } from "../canvas/box.ts";
import { Component } from "../component.ts";

export class Box extends Component {
  declare drawnObjects: [box: BoxObject];

  update(): void {
    const [box] = this.drawnObjects;

    box.style = this.style;
    box.dynamic = this.forceDynamicRendering;
    box.rectangle = this.rectangle;
    box.zIndex = this.zIndex;
  }

  draw(): void {
    const box = new BoxObject({
      rectangle: this.rectangle,
      style: this.style,
      dynamic: this.forceDynamicRendering,
      zIndex: this.zIndex,
    });

    this.drawnObjects[0] = box;
    this.tui.canvas.drawObject(box);
  }
}
