export type Stdout = typeof Deno.stdout;
export type Stdin = typeof Deno.stdin;

export interface Rectangle {
  column: number;
  row: number;
  width: number;
  height: number;
}

export type ConsoleSize = ReturnType<typeof Deno.consoleSize>;
