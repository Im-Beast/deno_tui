import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";
import { Canvas, DrawBoxOptions, DrawTextOptions } from "../src/canvas.ts";

const c = new Canvas({
  refreshRate: 1000 / 60,
  stdout: Deno.stdout,
});

c.drawBox({
  rectangle: {
    column: 0,
    row: 0,
    get width() {
      return c.size.columns;
    },
    get height() {
      return c.size.rows;
    },
  },
  style: crayon.bgBlack,
  zIndex: -1,
});

c.drawText({
  rectangle: {
    column: 0,
    row: 0,
  },
  style: crayon.green,
  get value() {
    return c.fps.toFixed(2);
  },
  dynamic: true,
});

let value = `Hi ${Math.random().toFixed(~~(Math.random() * 10))}`;

const text: DrawTextOptions = {
  rectangle: {
    column: 5,
    row: 5,
  },
  style: crayon.bgGreen,
  get value() {
    return value;
  },
  dynamic: true,
};
c.drawText(text);

let col = 0;
let row = 0;
let dirCol = 1;
let dirRow = 1;
let h = 0;

for (let i = 0; i < 10; ++i) {
  const box: DrawBoxOptions = {
    rectangle: {
      get column() {
        return ~~col + i * 10;
      },
      get row() {
        return ~~row;
      },
      width: 6,
      height: 3,
    },
    get style() {
      return crayon.bgHsl(h % 360, 50, 50);
    },
    // You can also set `rendered` to false to rerender it manually!
    dynamic: true,
    zIndex: 2,
  };
  c.drawBox(box);
}

c.start();
c.on("render", () => {
  ++h;
  col += 1 * dirCol;
  row += 0.5 * dirRow;
  if (row >= c.size.rows || row <= 0) dirRow *= -1;
  if (col >= c.size.columns || col <= 0) dirCol *= -1;

  value = `Hi ${Math.random().toFixed(~~(Math.random() * 10))}`;
});
