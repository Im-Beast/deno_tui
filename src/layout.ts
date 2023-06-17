/*
const layout new Layout({
  pattern:`
ab
ab
cc
  `,
  rectangle: {
    column: 10,
    row: 5
    width: 20,
    height: 10,
  },
  overwrite: {
    "c": {
      height: 1,
    }
  }
});

 new Box({
...,
rectangle: layout.element("a"),
 });

canvas.size.subscribe((v) => {
    if (something with size) {
      layout.pattern = newPattern;
    }
});
*/

import { Signal, signalify, SignalOfObject } from "../mod.ts";
import { Rectangle } from "./types.ts";

export interface LayoutGroupList {
  [group: string]: Signal<LayoutGroup>;
}

export type LayoutGroup = Rectangle & {
  prepared?: boolean;
};

export interface LayoutOverride {
  [group: string]: Partial<Rectangle>;
}

export interface LayoutMakerOptions {
  pattern: string;
  rectangle: Rectangle | SignalOfObject<Rectangle>;

  gap?: number;
  override?: LayoutOverride;
}

export class Layout {
  #pattern: string;
  layout: LayoutGroupList;
  rectangle: Signal<Rectangle>;

  override?: LayoutOverride;
  gap: number;

  constructor(options: LayoutMakerOptions) {
    this.rectangle = signalify(options.rectangle);
    this.rectangle.subscribe(() => {
      this.analyze();
    });

    this.#pattern = options.pattern;
    this.override = options.override;
    this.gap = options.gap ?? 0;
    this.layout = {};

    this.analyze();
  }

  set pattern(value: string) {
    this.#pattern = value;
    this.analyze();
  }

  get pattern() {
    return this.#pattern;
  }

  analyze(): void {
    const { layout } = this;
    const pattern = this.#pattern;
    const { column, row, width, height } = this.rectangle.value;

    const patternWidth = pattern.indexOf("\n");
    const patternHeight = (pattern.length - 1) / (patternWidth + 1);

    const widthRatio = width / patternWidth;
    const heightRatio = height / patternHeight;

    const groups: Set<LayoutGroup> = new Set();

    const cursorGroups: LayoutGroup[][] = [];
    const emptyGroup: LayoutGroup = {
      column: 0,
      row: 0,
      height: 0,
      width: 0,
    };

    let cursorColumn = 0;
    let cursorRow = 0;
    let lastGroup: LayoutGroup | undefined;
    for (const char of pattern) {
      if (char === "\n") {
        cursorColumn = 0;
        cursorRow += 1;
        lastGroup = undefined;
        continue;
      }

      let group: LayoutGroup = layout[char]?.value;
      if (group?.prepared) {
        group = layout[char].value;
        group.column = cursorColumn;
        group.row = cursorRow;
        group.width = 0;
        group.height = 0;
        group.prepared = false;
      } else if (!group) {
        layout[char] = new Signal<LayoutGroup>({
          column: cursorColumn,
          row: cursorRow,
          width: 0,
          height: 0,
          prepared: false,
        }, { deepObserve: true });
        group = layout[char].value;
      }

      groups.add(group);

      cursorGroups[cursorRow] ??= [];
      cursorGroups[cursorRow][cursorColumn] = group;

      group.height = cursorRow - group.row + 1;
      if (group.height === 1) {
        group.width += 1;
      }

      cursorColumn += 1;
      lastGroup = group;
    }

    for (const group of groups) {
      group.column = column + Math.round(group.column * widthRatio);
      group.row = row + Math.round(group.row * heightRatio);
      group.width = Math.round(group.width * widthRatio);
      group.height = Math.round(group.height * heightRatio);
      group.prepared = true;
    }

    for (let c = 0; c < patternWidth; ++c) {
      lastGroup = undefined;
      for (let r = 0; r < patternHeight; ++r) {
        const group = cursorGroups[r][c];
        if (group === lastGroup) continue;

        if (lastGroup) {
          const emptySpace = lastGroup.row + lastGroup.height - group.row;
          if (emptySpace) {
            group.row += emptySpace;
          }
        }

        if (group !== emptyGroup) {
          lastGroup = group;
        }
      }
    }

    for (const rows of cursorGroups) {
      lastGroup = undefined;
      let totalWidth = 0;

      for (const [c, group] of rows.entries()) {
        if (group === lastGroup) continue;

        totalWidth += group.width;

        if (lastGroup) {
          const emptySpace = lastGroup.column + lastGroup.width - group.column;
          if (emptySpace) {
            group.column += emptySpace;
          }

          if (c === rows.length - 1 && totalWidth < widthRatio * (c + 1)) {
            lastGroup.width += 1;
          }
        }

        if (group !== emptyGroup) {
          lastGroup = group;
        }
      }
    }
  }

  element(group: string): Signal<Rectangle> {
    const rectangle = this.layout[group];
    if (!rectangle) throw new Error("Tried to retrieve element group that doesn't exist");
    return rectangle;
  }
}
