import { ComponentOptions } from "../component.ts";
import { crayon } from "../deps.ts";
import { Style, Theme } from "../theme.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { clamp } from "../util.ts";
import { ViewComponent } from "./view.ts";

export interface ScrollableViewTheme extends Theme {
  scrollbar: {
    horizontal: {
      track: Style;
      thumb: Style;
    };
    vertical: {
      track: Style;
      thumb: Style;
    };
    corner: Style;
  };
}

export interface ViewComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  theme?: DeepPartial<ScrollableViewTheme>;
}

// TODO: Use sliders as scrollbars
export class ScrollableViewComponent extends ViewComponent {
  declare rectangle: Rectangle;
  declare theme: ScrollableViewTheme;

  constructor(options: ViewComponentOptions) {
    super(options);

    const { theme } = options;

    const horizontal = theme?.scrollbar?.horizontal;

    const vertical = theme?.scrollbar?.vertical;
    const corner = theme?.scrollbar?.corner;
    this.theme.scrollbar = {
      horizontal: {
        track: horizontal?.track ?? crayon,
        thumb: horizontal?.thumb ?? crayon,
      },
      vertical: {
        track: vertical?.track ?? crayon,
        thumb: vertical?.thumb ?? crayon,
      },
      corner: corner ?? crayon,
    };

    this.tui.addEventListener("mousePress", ({ detail: { scroll, shift } }) => {
      if (!scroll || this.state === "base") return;

      if (shift) {
        this.offset.x = clamp(this.offset.x + scroll, 0, this.maxOffset.x);
      } else {
        this.offset.y = clamp(this.offset.y + scroll, 0, this.maxOffset.y);
      }
    });
  }

  draw() {
    super.draw();

    const { canvas } = this.tui.tui;
    const { column, row, width, height } = this.rectangle;

    if (this.maxOffset.x > 0) {
      const horizontalStyle = this.theme.scrollbar.horizontal;
      canvas.draw(column, row + height, horizontalStyle.track(" ".repeat(width)));
      canvas.draw(column + (this.offset.x / this.maxOffset.x) * (width - 1), row + height, horizontalStyle.thumb(" "));
    }

    if (this.maxOffset.y > 0) {
      const verticalStyle = this.theme.scrollbar.vertical;
      for (let r = row; r < row + height; ++r) {
        canvas.draw(column + width, r, verticalStyle.track(" "));
      }
      canvas.draw(column + width, row + (this.offset.y / this.maxOffset.y) * (height - 1), verticalStyle.thumb(" "));
    }

    if (this.maxOffset.x > 0 && this.maxOffset.y > 0) {
      const cornerStyle = this.theme.scrollbar.corner;
      canvas.draw(column + width, row + height, cornerStyle(" "));
    }
  }

  interact() {
    this.state = "focused";
  }
}
