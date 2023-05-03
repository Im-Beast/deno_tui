// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { BoxObject } from "../canvas/box.ts";
import { Component } from "../component.ts";

export class Box extends Component {
  declare drawnObjects: { box: BoxObject };

  draw(): void {
    super.draw();

    const box = new BoxObject({
      canvas: this.tui.canvas,
      view: this.view,
      style: this.style,
      zIndex: this.zIndex,
      rectangle: this.rectangle,
    });

    this.drawnObjects.box = box;
    box.draw();
  }
}
