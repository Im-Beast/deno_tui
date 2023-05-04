// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Offset, Rectangle } from "./types.ts";

interface ViewOptions {
  offset?: Offset;
  maxOffset?: Offset;
  rectangle: Rectangle;
}

export class View {
  offset: Offset;
  maxOffset: Offset;
  rectangle: Rectangle;

  constructor(options: ViewOptions) {
    this.rectangle = options.rectangle;
    this.offset = options.offset ?? { columns: 0, rows: 0 };
    this.maxOffset = options.maxOffset ?? { columns: 0, rows: 0 };
  }
}
