# pi-compact-ex

A Pi extension that triggers automatic context compaction at a configurable percentage of the model's context window.

The default threshold is 90%. The active value appears in Pi's extension status slot:

```text
compact 90%
```

## Installation

Install from npm:

```bash
pi install npm:pi-compact-ex
```

Or install directly from GitHub:

```bash
pi install git:github.com/evan-choi/pi-compact-ex
```

If Pi is already running, reload its resources:

```text
/reload
```

## Usage

Show the current threshold:

```text
/compact-threshold
```

Set a new threshold:

```text
/compact-threshold 85
```

The command accepts integers from `1` through `99`. Changes are persisted globally in `~/.pi/agent/pi-compact-ex.json` and reflected in the extension status immediately.

## Behavior

After every `turn_end`, the extension checks the current context-window usage. When usage reaches the configured threshold, it calls Pi's `ctx.compact()` API. Compaction starts after the current turn finishes, not while a response is streaming.

The extension replaces only Pi's built-in threshold-based trigger. It preserves:

- context-overflow recovery and retry
- manual `/compact`
- Pi's existing summary generation

A compaction-in-progress guard prevents duplicate requests from the same agent run.

## Development

Requirements:

- Node.js 22.19 or newer
- Pi (tested with 0.80.7)

Run the test suite:

```bash
npm test
```

Test the extension from a local checkout:

```bash
pi -e ./index.ts
```

## License

[MIT](LICENSE)
