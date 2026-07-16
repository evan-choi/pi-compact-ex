# Compact threshold status 설계

## 문제

현재 extension은 Pi의 기본 footer가 출력한 ` (auto)` 문자열을 찾아 ` (auto 90%)` 형태로 치환한다. 이 방식은 Pi footer의 내부 문구와 형식에 의존한다.

threshold 표시는 기본 footer 렌더링과 분리하고 공식 `ctx.ui.setStatus()` API를 사용한다.

## 변경 범위

- status key는 `pi-compact-ex`를 사용한다.
- status 값은 `compact ${threshold}%` 형식으로 표시한다.
- `session_start`에서 설정을 읽은 뒤 status를 설정한다.
- `/compact-threshold` 저장 성공 후 status를 새 값으로 갱신한다.
- custom footer 생성 코드와 `(auto)` 문자열 치환을 제거한다.
- `FooterComponent`, `truncateToWidth`, `@earendil-works/pi-tui` 의존성을 제거한다.

자동 compaction 조건, 중복 요청 방지, Pi 기본 threshold 취소, 설정 파일 형식은 변경하지 않는다.

## 동작 흐름

### Session 시작

1. 저장된 threshold를 읽는다.
2. 설정이 없으면 기본값 `90`을 사용한다.
3. 설정이 잘못된 경우 기존 warning을 표시하고 기본값 `90`을 사용한다.
4. `ctx.ui.setStatus("pi-compact-ex", "compact 90%")`를 호출한다.

### Threshold 변경

1. `/compact-threshold <1-99>` 입력을 검증한다.
2. 설정 파일 저장에 성공하면 메모리의 threshold를 갱신한다.
3. status를 새 값으로 갱신한다.
4. 기존 success notification을 표시한다.

저장에 실패하면 기존 threshold와 status를 유지하고 error notification을 표시한다.

## 테스트

- session 시작 후 `compact 90%`가 status에 설정되는지 확인한다.
- `/compact-threshold 85` 실행 후 `compact 85%`로 갱신되는지 확인한다.
- 잘못된 입력이나 저장 실패 시 status가 바뀌지 않는지 확인한다.
- 기존 threshold compaction과 overflow/manual 보존 테스트를 유지한다.
- 중복 compaction 요청 방지 동작을 유지한다.

## 완료 조건

- extension이 `FooterComponent`를 생성하거나 footer 문자열을 치환하지 않는다.
- threshold 변경이 같은 session의 status에 즉시 반영된다.
- `npm test`가 통과한다.
