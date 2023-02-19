import { TextObject } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";

export interface TextOptions extends Omit<ComponentOptions, "rectangle"> {
  value: string;
  rectangle: Omit<Rectangle, "width" | "height">;
}

export class Text extends Component {
  declare drawnObjects: [text: TextObject];
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
    const [text] = this.drawnObjects;

    text.value = this.value;
    text.style = this.style;
    text.rectangle = this.rectangle;
    text.zIndex = this.zIndex;
  }

  draw(): void {
    const text = new TextObject({
      value: this.value,
      rectangle: this.rectangle,
      style: this.style,
      zIndex: this.zIndex,
    });

    this.drawnObjects[0] = text;
    this.tui.canvas.drawObject(text);
  }
}
