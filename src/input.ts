// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Tui } from "./tui.ts";
import { emitInputEvents } from "./input_reader/mod.ts";

/** Emit input events to Tui  */
export async function handleInput(tui: Tui): Promise<void> {
  await emitInputEvents(tui.stdin, tui, tui.refreshRate);
}
