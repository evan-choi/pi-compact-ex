# Compact Threshold Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pi 기본 footer 문자열을 수정하지 않고 compact threshold를 extension status slot에 표시한다.

**Architecture:** `createExtension`은 threshold를 읽거나 변경한 직후 `ctx.ui.setStatus()`를 호출한다. custom footer 생성 코드와 TUI 렌더링 의존성은 제거한다.

**Tech Stack:** Node.js 22.19+, ECMAScript modules, Pi extension API, `node:test`

## Global Constraints

- status key는 `pi-compact-ex`다.
- status 값은 `compact ${threshold}%` 형식이다.
- 자동 compaction 조건과 설정 파일 형식은 변경하지 않는다.
- 새 dependency를 추가하지 않는다.

---

### Task 1: Footer 치환을 extension status로 교체

**Files:**
- Modify: `extension.test.mjs:20-151`
- Modify: `extension.mjs:12-99`
- Modify: `index.ts:1-8`
- Modify: `package.json:27-30`

**Interfaces:**
- Consumes: Pi `ExtensionContext.ui.setStatus(key: string, value: string | undefined)`
- Produces: status key `pi-compact-ex`, status 값 `compact ${threshold}%`

- [x] **Step 1: status 기록과 갱신 실패 테스트 작성**

footer 전용 fixture를 제거하고 `createContext()`를 다음과 같이 변경한다.

```javascript
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
```

`createPi()`의 footer 테스트 전용 `getThinkingLevel()`도 제거한다.

기존 custom footer 테스트를 다음 status 테스트로 교체한다.

```javascript
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
```

저장 실패 시 기존 status가 유지되는 테스트를 추가한다.

```javascript
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
```

- [x] **Step 2: 변경한 테스트가 실패하는지 확인**

Run: `node --test extension.test.mjs`

Expected: status가 기록되지 않아 새 status 테스트가 FAIL한다.

- [x] **Step 3: 최소 구현 적용**

`extension.mjs`에서 `installFooter`, `FooterComponent`, `truncateToWidth`를 제거하고 함수 signature를 복원한다.

```javascript
export function createExtension(configPath = DEFAULT_CONFIG_PATH) {
	return function (pi) {
		let threshold = DEFAULT_THRESHOLD;
		let compacting = false;
```

`session_start`에서 threshold를 읽은 뒤 status를 설정한다.

```javascript
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
	ctx.ui.setStatus("pi-compact-ex", `compact ${threshold}%`);
});
```

설정 저장 성공 후 메모리 값을 갱신한 다음 status를 갱신한다.

```javascript
await saveThreshold(configPath, nextThreshold);
threshold = nextThreshold;
ctx.ui.setStatus("pi-compact-ex", `compact ${threshold}%`);
ctx.ui.notify(`Auto-compaction threshold: ${threshold}%`, "info");
```

`index.ts`는 TUI 관련 import 없이 config path만 전달한다.

```typescript
import { join } from "node:path";

import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { createExtension } from "./extension.mjs";

const configPath = join(getAgentDir(), "pi-compact-ex.json");

export default createExtension(configPath);
```

`package.json`의 peer dependency는 Pi extension API만 남긴다.

```json
"peerDependencies": {
  "@earendil-works/pi-coding-agent": "*"
}
```

- [x] **Step 4: 전체 테스트 실행**

Run: `npm test`

Expected: 모든 테스트가 PASS한다.

- [x] **Step 5: diff 검증**

Run: `git diff --check && ! rg -n 'FooterComponent|truncateToWidth|replace\(" \(auto\)"|@earendil-works/pi-tui' extension.mjs index.ts package.json extension.test.mjs`

Expected: command가 exit code 0으로 끝난다.

- [x] **Step 6: 구현 커밋**

```bash
git add extension.mjs extension.test.mjs index.ts package.json docs/superpowers/plans/2026-07-16-compact-status.md
git commit -m "fix: compact threshold를 status로 표시"
```
