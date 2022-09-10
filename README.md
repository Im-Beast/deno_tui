# ⌨️ Tui

<img src="https://raw.githubusercontent.com/Im-Beast/deno_tui/main/docs/logo-transparent.png" align="right" width="250" height="250" alt="Deno mascot made as ASCII art" />

[![Deno](https://github.com/Im-Beast/deno_tui/actions/workflows/deno.yml/badge.svg)](https://github.com/Im-Beast/deno_tui/actions/workflows/deno.yml)
[![Deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https://deno.land/x/tui/mod.ts)

Simple [Deno](https://github.com/denoland/deno/) module that allows easy creation of
[Terminal User Interfaces](https://en.wikipedia.org/wiki/Text-based_user_interface).

### 🔩 Features

- 🔰 Ease of use
- 👁️‍🗨️ Reactivity
- 🖇️ No dependencies
- 📄 Decent documentation
- [📦 Multiple ready-to-use components](./src/components/)
- 🎨 Styling framework agnostic
  - This means you can use whatever terminal styling module you want
  - [🖍️ Crayon](https://github.com/crayon-js/crayon) is recommended _but not imposed_ as it greatly integrates with Tui
- 🪶 Relatively lightweight

## 🖥️ OS Support

> **Note** --unstable flag is required everywhere, because not every used API is stabilized yet.

| Operating system     | Linux | macOS | Windows¹<sup>,</sup>² | WSL  |
| -------------------- | ----- | ----- | --------------------- | ---- |
| Base                 | ✔️    | ✔️    | ✔️                    | ✔️   |
| Keyboard support     | ✔️    | ✔️    | ✔️                    | ✔️   |
| Mouse support        | ✔️    | ✔️    | ❌                     | ✔️   |
| Required permissions | none  | none  | --allow-ffi³          | none |

¹ - [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) is a heavily recommended way to run Tui on Windows, if
you need to stick to clean Windows, please consider using [Windows Terminal](https://github.com/Microsoft/Terminal).

² - If unicode characters are displayed incorrectly type `chcp 65001` into the console to change active console code
page to use UTF-8 encoding.

³ - Related to [this issue](https://github.com/denoland/deno/issues/5945), in order to recognize all pressed keys
(including arrows etc.) on Windows Tui uses `C:\Windows\System32\msvcrt.dll` to read pressed keys via `_getch` function,
see code [here](./src/key_reader.ts?plain=1#L116).

## 🎓 Get started

1. Create Tui instance

```ts
import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";
import { Canvas, Tui } from "https://deno.land/x/tui@version/mod.ts";

const tui = new Tui({
  style: crayon.bgBlue,
  canvas: new Canvas({
    refreshRate: 1000 / 60, // Run in 60FPS
    stdout: Deno.stdout,
  }),
});

tui.dispatch(); // Close Tui on CTRL+C
```

2. Enable interaction using keyboard and mouse

```ts
import { handleKeyboardControls, handleKeypresses, handleMouseControls } from "https://deno.land/x/tui@version/mod.ts";

...

handleKeypresses(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
```

3. Add some components

```ts
import { ButtonComponent } from "https://deno.land/x/tui@version/src/components/mod.ts";

...

let value = 0;
const button = new ButtonComponent({
  tui,
  theme: {
    base: crayon.bgRed,
    focused: crayon.bgLightRed,
    active: crayon.bgYellow,
  },
  rectangle: {
    column: 15,
    row: 3,
    height: 5,
    width: 10,
  },
  label: String(value),
});

button.addEventListener("stateChange", () => {
  if (button.state !== "active") return;
  button.label = String(++value);
})
```

4. Run Tui

```ts
...

tui.run();
```

## 🤝 Contributing

**Tui** is open for any contributions.
<br /> If you feel like you can enhance this project - please open an issue and/or pull request.
<br /> Code should be well document and easy to follow what's going on.

This project follows [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.
<br /> If your pull request's code could introduce understandability trouble, please add comments to it.

## 📝 Licensing

This project is available under **MIT** License conditions.
