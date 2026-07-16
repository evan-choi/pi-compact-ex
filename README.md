# pi-compact-ex

Pi의 자동 compaction 시점을 context window 사용률로 설정하는 extension입니다. 기본 임계값은 90%이며, 현재 설정값을 footer의 `(auto N%)` 표시에 함께 보여줍니다.

```text
$6.773 (sub) 37.6%/372k (auto 90%)
```

## 설치

Pi의 전역 extension 디렉터리에 clone합니다.

```bash
git clone git@github.com:evan-choi/pi-compact-ex.git \
  ~/.pi/agent/extensions/pi-compact-ex
```

실행 중인 Pi에서 extension을 다시 불러옵니다.

```text
/reload
```

## 사용법

현재 임계값을 확인합니다.

```text
/compact-threshold
```

임계값을 85%로 변경합니다. `1`부터 `99`까지의 정수만 허용합니다.

```text
/compact-threshold 85
```

변경값은 즉시 footer에 반영되고 `config.json`에 저장됩니다. 이 파일은 repository에서 제외되며 모든 프로젝트에 동일하게 적용됩니다.

## 동작 방식

Extension은 각 `turn_end`에서 현재 context 사용률을 확인합니다. 설정한 임계값 이상이면 `ctx.compact()`를 호출하며, 동일한 turn에서 중복 compaction이 시작되지 않도록 막습니다.

Pi의 기본 threshold compaction만 대체합니다. 다음 동작은 그대로 유지됩니다.

- context overflow 감지 및 복구
- 수동 `/compact`
- 기존 compaction summary 생성 방식

Compaction은 streaming 도중이 아니라 현재 turn이 끝난 뒤 실행됩니다.

## 개발 및 검증

외부 dependency 없이 Node.js 내장 test runner를 사용합니다.

```bash
node --test *.test.mjs
```

Pi `0.80.7`에서 extension 로드, footer 즉시 갱신, 좁은 terminal에서의 line truncation을 확인했습니다.
