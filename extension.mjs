import { fileURLToPath } from "node:url";

import {
	DEFAULT_THRESHOLD,
	loadThreshold,
	parseThreshold,
	saveThreshold,
	shouldCompact,
} from "./threshold.mjs";

const DEFAULT_CONFIG_PATH = fileURLToPath(new URL("./config.json", import.meta.url));

export function createExtension(configPath = DEFAULT_CONFIG_PATH) {
	return function (pi) {
		let threshold = DEFAULT_THRESHOLD;
		let compacting = false;

		pi.on("session_start", async (_event, ctx) => {
			compacting = false;
			try {
				threshold = await loadThreshold(configPath);
			} catch (error) {
				threshold = DEFAULT_THRESHOLD;
				if (ctx.hasUI) {
					const message = error instanceof Error ? error.message : String(error);
					ctx.ui.notify(`Invalid pi-compact-ex config: ${message}`, "warning");
				}
			}
		});

		pi.on("session_before_compact", (event) => {
			if (event.reason === "threshold") {
				return { cancel: true };
			}
		});

		pi.on("turn_end", (_event, ctx) => {
			const percent = ctx.getContextUsage()?.percent ?? null;
			if (compacting || !shouldCompact(percent, threshold)) {
				return;
			}

			compacting = true;
			ctx.compact({
				onComplete: () => {
					compacting = false;
				},
				onError: (error) => {
					compacting = false;
					if (ctx.hasUI) {
						ctx.ui.notify(`Auto-compaction failed: ${error.message}`, "warning");
					}
				},
			});
		});

		pi.registerCommand("compact-threshold", {
			description: "Show or set the auto-compaction percentage (1-99)",
			handler: async (args, ctx) => {
				const input = args.trim();
				if (!input) {
					ctx.ui.notify(`Auto-compaction threshold: ${threshold}%`, "info");
					return;
				}

				const nextThreshold = parseThreshold(input);
				if (nextThreshold === undefined) {
					ctx.ui.notify("Usage: /compact-threshold <1-99>", "warning");
					return;
				}

				try {
					await saveThreshold(configPath, nextThreshold);
					threshold = nextThreshold;
					ctx.ui.notify(`Auto-compaction threshold: ${threshold}%`, "info");
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					ctx.ui.notify(`Failed to save pi-compact-ex config: ${message}`, "error");
				}
			},
		});
	};
}

export default createExtension();
