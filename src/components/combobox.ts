import { Button, ButtonOptions } from "./button.ts";

export interface ComboBoxOptions<Items extends string[] = string[]> extends ButtonOptions {
  items: Items;
  value?: Items[number];
}

export class ComboBox<Items extends string[] = string[]> extends Button {
  // declare drawnObjects: { box: BoxObject };
  declare subComponents: { [button: number]: Button };

  expanded: boolean;

  items: Items;
  value?: Items[number];
  label: { value: string };

  constructor(options: ComboBoxOptions<Items>) {
    super(options);
    this.expanded = false;
    this.value = options.value;
    this.items = options.items;
    this.label = options.label ?? {
      value: options.value ?? options.items[0],
    };
  }

  update(): void {
    super.update();

    const { subComponents, theme, zIndex } = this;
    const { column, row, width, height } = this.rectangle;

    for (const [i, item] of this.items.entries()) {
      const subComponent = subComponents[i];
      if (subComponent) {
        subComponent.label!.value = item;
        subComponent.theme = this.theme;
        subComponent.zIndex = this.zIndex;
        subComponent.visible = this.expanded;

        subComponent.rectangle.column = column;
        subComponent.rectangle.row = row + (i + 1) * height;
        subComponent.rectangle.width = width;
        subComponent.rectangle.height = height;
      } else {
        const button = new Button({
          parent: this,
          label: {
            value: item,
            align: {
              horizontal: "center",
              vertical: "center",
            },
          },
          rectangle: {
            column,
            row: row + (i + 1) * height,
            width,
            height,
          },
          theme,
          zIndex,
        });

        button.on("stateChange", () => {
          if (button.state !== "active") return;
          this.value = item;
          this.label.value = item;
          this.expanded = false;
          this.emit("valueChange", this);
        });

        subComponents[i] = button;
      }
    }
  }

  interact(method: "mouse" | "keyboard"): void {
    super.interact(method);

    if (this.state === "active") {
      this.expanded = !this.expanded;
    }
  }
}
