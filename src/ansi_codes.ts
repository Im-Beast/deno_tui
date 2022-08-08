/** Get ANSI escape code for moving cursor to given location */
export function moveCursor(row: number, column: number): string {
  return `\x1b[${row + 1};${column + 1}H`;
}

/** ANSI escape code to enable mouse handling */
export const ENABLE_MOUSE = "\x1b[?1000h\x1b[?1002h\x1b[?1005h\x1b[?1006h";

/** ANSI escape code to disable mouse handling */
export const DISABLE_MOUSE = "\x1b[?1000l\x1b[?1002l\x1b[?1005l\x1b[?1006l";

/** ANSI escape code to hide terminal cursor  */
export const HIDE_CURSOR = `\x1b[?25l`;

/** ANSI escape code to show terminal cursor  */
export const SHOW_CURSOR = `\x1b[?25h`;

/** ANSI escape code to clear screen  */
export const CLEAR_SCREEN = `\x1b[2J`;
