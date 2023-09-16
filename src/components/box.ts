// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { BoxPainter } from "../canvas/painters/box.ts";
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
  declare drawnObjects: { box: BoxPainter };

  draw(): void {
    super.draw();

    const box = new BoxPainter({
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
