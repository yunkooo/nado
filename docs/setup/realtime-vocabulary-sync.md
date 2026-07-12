# 단어장 Realtime 검증

Web, Mobile, Desktop에서 단어장 저장·삭제가 새로고침 없이 반영되는지 확인하는 문서다.

## 준비

- 세 앱이 같은 API와 Supabase 프로젝트를 사용한다.
- 최신 Supabase migration이 적용되어 있다.
- 같은 Google 계정으로 세 앱에 로그인할 수 있다.
- 계정 격리를 확인할 두 번째 테스트 계정이 있다.
- `vocabulary:<user_id>` private channel을 위한 RLS policy가 적용되어 있다.

## 자동 smoke

API 서버를 실행한 뒤 다음 명령을 사용한다.

```bash
NADO_API_BASE_URL=http://localhost:4000 \
NADO_SMOKE_ACCESS_TOKEN="<Supabase access token>" \
NADO_SMOKE_REALTIME=1 \
pnpm smoke:backend
```

필요할 때만 아래 값을 추가한다.

```text
NADO_SMOKE_USER_ID=<Supabase user id>
NADO_SMOKE_SUPABASE_URL=<Supabase project URL>
NADO_SMOKE_SUPABASE_ANON_KEY=<Supabase anon key>
NADO_SMOKE_REALTIME_TIMEOUT_MS=5000
NADO_SMOKE_VOCABULARY_TERM=<unique test term>
```

성공 결과에는 아래 check가 포함된다.

```text
health
vocabulary:save
vocabulary:realtime:save
vocabulary:list
vocabulary:delete
vocabulary:realtime:delete
```

이미 있는 단어를 저장하면 `INSERT` 대신 `UPDATE` broadcast가 올 수 있다.

## 수동 확인

1. 세 앱에 같은 계정으로 로그인한다.
2. 세 앱에서 단어장 또는 복습 화면을 연다.
3. Web 분석 결과에서 식별하기 쉬운 테스트 단어를 저장한다.
4. Mobile과 Desktop에 새 항목이 새로고침 없이 나타나는지 확인한다.
5. Mobile에서 해당 항목을 삭제한다.
6. Web과 Desktop에서 새로고침 없이 사라지는지 확인한다.
7. 한 앱에서 로그아웃한 뒤 다른 앱에서 저장·삭제한다.
8. 로그아웃한 앱이 이벤트를 반영하지 않는지 확인한다.
9. 다른 계정으로 로그인해 이전 계정 이벤트가 섞이지 않는지 확인한다.
10. 테스트 항목을 삭제한다.

## 실패 시 확인

| 증상                       | 먼저 확인할 것                                          |
| -------------------------- | ------------------------------------------------------- |
| 저장·삭제 API 실패         | access token, API Supabase 설정, `vocabulary_items` RLS |
| API 성공, Realtime timeout | 앱과 smoke가 같은 Supabase URL을 사용하는지 확인        |
| 특정 사용자만 실패         | channel의 user id와 로그인 user id 비교                 |
| 특정 앱만 갱신 안 됨       | session 변경·logout 시 구독 cleanup 확인                |
| focus 후에만 반영          | broadcast handler가 목록 refresh를 호출하는지 확인      |

검증 결과에는 날짜, 환경, 사용 계정, 성공 check, 실패 지점을 기록한다. 실제 token과 user id는 문서나 PR에 남기지 않는다.
