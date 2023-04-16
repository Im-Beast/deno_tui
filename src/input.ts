import { Tui } from "./tui.ts";
import { emitInputEvents } from "./input_reader/mod.ts";

export async function handleInput(tui: Tui): Promise<void> {
  await emitInputEvents(tui.stdin, tui);
}
