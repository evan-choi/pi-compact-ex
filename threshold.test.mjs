import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	DEFAULT_THRESHOLD,
	loadThreshold,
	parseThreshold,
	saveThreshold,
	shouldCompact,
} from "./threshold.mjs";

test("기본 임계값은 90%다", () => {
	assert.equal(DEFAULT_THRESHOLD, 90);
});

test("1부터 99까지의 정수 percentage만 허용한다", () => {
	assert.equal(parseThreshold("1"), 1);
	assert.equal(parseThreshold("90"), 90);
	assert.equal(parseThreshold("99"), 99);
	assert.equal(parseThreshold("0"), undefined);
	assert.equal(parseThreshold("90.5"), undefined);
	assert.equal(parseThreshold("100"), undefined);
	assert.equal(parseThreshold("abc"), undefined);
});

test("현재 사용량이 임계값 이상일 때 compact한다", () => {
	assert.equal(shouldCompact(null, 90), false);
	assert.equal(shouldCompact(89.9, 90), false);
	assert.equal(shouldCompact(90, 90), true);
	assert.equal(shouldCompact(100, 90), true);
});

test("설정 파일이 없으면 기본값을 사용한다", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-compact-ex-"));
	assert.equal(await loadThreshold(join(dir, "config.json")), DEFAULT_THRESHOLD);
});

test("저장한 percentage를 다시 읽는다", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-compact-ex-"));
	const path = join(dir, "config.json");

	await saveThreshold(path, 85);

	assert.equal(await loadThreshold(path), 85);
});
