// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { DrawBoxOptions } from "../canvas.ts";
import { PlaceComponent, PlaceComponentOptions } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";

/** Simple component that is a Box that cannot be interacted with by default */
export class Box<EventMap extends EventRecord = Record<never, never>> extends PlaceComponent<EventMap> {
  drawnObjects: {
    box?: DrawBoxOptions<true>;
  };

  constructor(options: PlaceComponentOptions) {
    super(options);
    this.drawnObjects = {};
  }

  update(): void {
    super.update();

    const { box } = this.drawnObjects;

    if (this.refresh && box) {
      box.rectangle = this.rectangle;
      box.zIndex = this.zIndex;
      box.style = this.style;
      box.dynamic = this.forceDynamicDrawing;

      box.rendered = false;
    }
  }

  draw(): void {
    super.draw();

    const { tui, drawnObjects } = this;
    const { canvas } = tui;

    if (drawnObjects.box) {
      canvas.drawnObjects.remove(drawnObjects.box);
    }

    const box = canvas.drawBox({
      rectangle: this.rectangle,
      style: this.style,
      zIndex: this.zIndex,
      dynamic: this.forceDynamicDrawing,
    });

    this.drawnObjects.box = box;
  }
}
