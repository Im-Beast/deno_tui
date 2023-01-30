import { DrawBoxOptions } from "../canvas.ts";
import { Component } from "../component.ts";

export class Box extends Component {
  declare drawnObjects: [box: DrawBoxOptions<true>];

  update(): void {
    const [box] = this.drawnObjects;

    box.style = this.style;
    box.dynamic = this.forceDynamicRendering;
    box.rectangle = this.rectangle;
    box.zIndex = this.zIndex;
  }

  draw(): void {
    this.drawnObjects[0] = this.tui.canvas.drawBox({
      rectangle: this.rectangle,
      style: this.style,
      dynamic: this.forceDynamicRendering,
      zIndex: this.zIndex,
    });
  }
}
