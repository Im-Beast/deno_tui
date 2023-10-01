// Copyright 2023 Im-Beast. MIT license.
import { BoxObject } from "../canvas/box.ts";
import { Component } from "../component.ts";

/**
 * Component for creating simple non-interactive box
 *
 * @example
 * ```ts
 * new Box({
 *  parent: tui,
 *  theme: {
 *    base: crayon.bgBlue,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    height: 5,
 *    width: 10,
 *  },
 *  zIndex: 0,
 * });
 * ```
 */
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
