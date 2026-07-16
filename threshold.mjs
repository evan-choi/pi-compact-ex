import { readFile, writeFile } from "node:fs/promises";

export const DEFAULT_THRESHOLD = 90;

export function parseThreshold(input) {
	const threshold = Number(input);
	return Number.isInteger(threshold) && threshold >= 1 && threshold <= 99 ? threshold : undefined;
}

export function shouldCompact(percent, threshold) {
	return percent !== null && percent >= threshold;
}

export async function loadThreshold(path) {
	try {
		const config = JSON.parse(await readFile(path, "utf8"));
		const threshold = parseThreshold(config.threshold);
		if (threshold === undefined) {
			throw new Error("threshold must be an integer from 1 to 99");
		}
		return threshold;
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			return DEFAULT_THRESHOLD;
		}
		throw error;
	}
}

export async function saveThreshold(path, threshold) {
	await writeFile(path, `${JSON.stringify({ threshold }, null, 2)}\n`, "utf8");
}
