import { DrawTextOptions } from "../canvas.ts";
import { Component, ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";

export interface TextOptions extends Omit<ComponentOptions, "rectangle"> {
  value: string;
  rectangle: Omit<Rectangle, "width" | "height">;
}

export class Text extends Component {
  declare drawnObjects: [text: DrawTextOptions<true>];
  value: string;

  constructor(options: TextOptions) {
    Object.assign(options.rectangle, {
      width: 0,
      height: 0,
    });
    super(options as unknown as ComponentOptions);
    this.value = options.value;
  }

  update(): void {
    const text = this.drawnObjects[0];

    text.value = this.value;
    text.style = this.style;
    text.dynamic = this.forceDynamicRendering;
    text.rectangle = this.rectangle;
    text.zIndex = this.zIndex;
  }

  draw(): void {
    this.drawnObjects[0] = this.tui.canvas.drawText({
      value: this.value,
      rectangle: this.rectangle,
      style: this.style,
      dynamic: this.forceDynamicRendering,
      zIndex: this.zIndex,
    });
  }
}
