import { BoxComponent } from "./box.ts";

export class ButtonComponent extends BoxComponent {
  declare label: string;

  draw() {
    super.draw();

    if (this.label) {
      const { canvas } = this.tui;
      const { column, row, width, height } = this.rectangle;

      canvas.draw(
        column + ~~(width / 2) - ~~(this.label.length / 2),
        row + ~~(height / 2) - 1,
        this.style(this.label),
      );
    }
  }
}
