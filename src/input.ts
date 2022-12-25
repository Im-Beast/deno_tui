import { Tui } from "./tui.ts";
import { readKeypresses } from "./key_reader.ts";
import { MultiKeyPress } from "./types.ts";

export async function handleInput(tui: Tui): Promise<void> {
  for await (const keyPresses of readKeypresses(tui.stdin)) {
    const multiKeyPress: MultiKeyPress = {
      key: "multi",
      keys: [],
      buffer: [],
      ctrl: false,
      meta: false,
      shift: false,
    };

    for (const keyPress of keyPresses) {
      if (keyPress.key === "mouse") {
        tui.emit("mousePress", keyPress);
      } else {
        tui.emit("keyPress", keyPress);
      }

      multiKeyPress.keys.push(keyPress.key);
      multiKeyPress.buffer.push(keyPress.buffer);
      multiKeyPress.shift ||= keyPress.shift;
      multiKeyPress.meta ||= keyPress.meta;
      multiKeyPress.ctrl ||= keyPress.ctrl;
    }

    if (multiKeyPress.keys.length > 1) {
      tui.emit("multiKeyPress", multiKeyPress);
    }
  }
}
