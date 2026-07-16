import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createExtension } from "./extension.mjs";

function createPi() {
	const handlers = new Map();
	const commands = new Map();
	return {
		handlers,
		commands,
		on(name, handler) {
			handlers.set(name, handler);
		},
		registerCommand(name, command) {
			commands.set(name, command);
		},
	};
}

function createContext(percent = 0) {
	const notifications = [];
	const compactCalls = [];
	const statuses = [];
	return {
		notifications,
		compactCalls,
		statuses,
		hasUI: true,
		ui: {
			notify(message, level) {
				notifications.push({ message, level });
			},
			setStatus(key, value) {
				statuses.push({ key, value });
			},
		},
		getContextUsage() {
			return { percent };
		},
		compact(options) {
			compactCalls.push(options);
		},
	};
}

async function setup() {
	const dir = await mkdtemp(join(tmpdir(), "pi-compact-ex-"));
	const pi = createPi();
	await createExtension(join(dir, "config.json"))(pi);
	await pi.handlers.get("session_start")({}, createContext());
	return pi;
}

test("Pi 기본 threshold compaction만 취소한다", async () => {
	const pi = await setup();
	const handler = pi.handlers.get("session_before_compact");

	assert.deepEqual(await handler({ reason: "threshold" }), { cancel: true });
	assert.equal(await handler({ reason: "overflow" }), undefined);
	assert.equal(await handler({ reason: "manual" }), undefined);
});

test("기본값 90% 이상에서 compaction을 요청한다", async () => {
	const pi = await setup();
	const below = createContext(89.9);
	const threshold = createContext(90);

	await pi.handlers.get("turn_end")({}, below);
	await pi.handlers.get("turn_end")({}, threshold);

	assert.equal(below.compactCalls.length, 0);
	assert.equal(threshold.compactCalls.length, 1);
});

test("slash command로 임계값을 전역 저장한다", async () => {
	const pi = await setup();
	const ctx = createContext();
	const command = pi.commands.get("compact-threshold");

	await command.handler("85", ctx);
	await pi.handlers.get("turn_end")({}, createContext(84.9));
	const threshold = createContext(85);
	await pi.handlers.get("turn_end")({}, threshold);

	assert.equal(threshold.compactCalls.length, 1);
	assert.deepEqual(ctx.notifications.at(-1), {
		message: "Auto-compaction threshold: 85%",
		level: "info",
	});
});

test("잘못된 percentage는 거부한다", async () => {
	const pi = await setup();
	const ctx = createContext();

	await pi.commands.get("compact-threshold").handler("100", ctx);

	assert.deepEqual(ctx.notifications.at(-1), {
		message: "Usage: /compact-threshold <1-99>",
		level: "warning",
	});
});

test("설정된 percentage를 extension status에 표시하고 즉시 갱신한다", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-compact-ex-"));
	const pi = createPi();
	await createExtension(join(dir, "config.json"))(pi);
	const ctx = createContext();
	await pi.handlers.get("session_start")({}, ctx);

	assert.deepEqual(ctx.statuses.at(-1), {
		key: "pi-compact-ex",
		value: "compact 90%",
	});

	await pi.commands.get("compact-threshold").handler("85", ctx);

	assert.deepEqual(ctx.statuses.at(-1), {
		key: "pi-compact-ex",
		value: "compact 85%",
	});
});

test("threshold 저장 실패 시 기존 status를 유지한다", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-compact-ex-"));
	const pi = createPi();
	await createExtension(join(dir, "missing", "config.json"))(pi);
	const ctx = createContext();
	await pi.handlers.get("session_start")({}, ctx);

	await pi.commands.get("compact-threshold").handler("85", ctx);

	assert.equal(ctx.statuses.length, 1);
	assert.deepEqual(ctx.statuses[0], {
		key: "pi-compact-ex",
		value: "compact 90%",
	});
	assert.equal(ctx.notifications.at(-1).level, "error");
});
