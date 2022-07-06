export type Stdout = typeof Deno.stdout;
export type Stdin = typeof Deno.stdin;

export interface Rectangle {
  column: number;
  row: number;
  width: number;
  height: number;
}

export type ConsoleSize = ReturnType<typeof Deno.consoleSize>;

type _Range<From extends number, To extends number, R extends unknown[]> =
  R["length"] extends To ? To
    : 
      | (R["length"] extends Range<0, From> ? From : R["length"])
      | _Range<From, To, [To, ...R]>;

export type Range<From extends number, To extends number> = number extends From
  ? number
  : _Range<From, To, []>;
