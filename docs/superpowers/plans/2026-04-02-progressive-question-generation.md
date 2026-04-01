# Progressive Question Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change AI question generation so the first question returns quickly (single DeepSeek call), prefetch remaining questions in the background while the user answers, with server-side dedup and session-scoped rate limits; remove the duck icon and full-screen loading mask on the index page.

**Architecture:** Index calls `generateQuestions` once with `count: 1`, `sessionId`, and `targetCount`, then navigates to practice. Practice keeps instance state (queue, pending requests, dedup list) and issues parallel prefetch calls (`count: 1`, `existingQuestions`, optional `prefetchHint`). Cloud function shortens prompts/tokens for single-question calls, validates and sanitizes inputs, enforces per-session call caps, and retries once on duplicate content.

**Tech stack:** WeChat Mini Program (pages + wx.cloud.callFunction), Node.js cloud functions (`wx-server-sdk`, `https` to DeepSeek).

**Spec:** `docs/superpowers/specs/2026-04-02-progressive-question-generation-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `cloudfunctions/generateQuestions/security.js` | `sessionId` format + per-session call cap; sanitize `existingQuestions`; integrate with `checkRateLimit` |
| `cloudfunctions/generateQuestions/index.js` | Prompt variants (`existingQuestions`, `prefetchHint`), `max_tokens` when `count===1`, dedup + one retry, pass `targetCount` through security |
| `pages/index/index.js` | `sessionId` (regex-safe suffix), `count: 1`, `targetCount`, `existingQuestions: []`, store `generateParams` on `globalData` |
| `pages/index/index.wxml` | Remove footer duck image and loading mask block |
| `pages/index/index.wxss` | Remove `.generate-duck` and loading-mask-related rules |
| `pages/practice/practice.js` | `formatSingleQuestion`, progressive `onLoad`, `prefetchQuestions`, `callGenerateOne`, `onPrefetchResult`, `showNextFromQueue`, `handleNext` branches, `onUnload` cleanup |
| `pages/practice/practice.wxml` | Waiting card when `waitingForNext` |
| `pages/practice/practice.wxss` | `.waiting-card`, `.waiting-duck`, `.waiting-text` aligned with `.question-card` |

---

### Task 1: Cloud function security — session + sanitization

**Files:**
- Modify: `/Users/jerry/Documents/zdx_wx/cloudfunctions/generateQuestions/security.js`
- Test: Manual — call function from devtools with/without `sessionId` (see Step 4)

- [ ] **Step 1: Add session cache and helpers**

Add a module-level `Map` for session limits (separate from `rateLimitCache`), e.g. `sessionLimitCache` keyed by `sessionId`, value `{ maxCalls, used, expiresAt }`. Session TTL cleanup: when map size grows or on each write, delete entries where `Date.now() > expiresAt` (5 minutes from first register).

Add constants:

```javascript
const SESSION_ID_RE = /^sess_\d{13}_[a-z0-9]{6}$/;
const SESSION_TTL_MS = 5 * 60 * 1000;
```

Add `sanitizeExistingQuestions(raw)`:

- If not an array, return `[]`
- Take at most 10 items
- Each item: `String(x).slice(0, 200)` (truncate, do not reject)

- [ ] **Step 2: Extend `validateParams`**

After existing checks, compute `sanitizedExisting = sanitizeExistingQuestions(event.existingQuestions)`.

- `sessionId` optional string: if present and does not match `SESSION_ID_RE`, treat as invalid session (caller will not get session bypass — see Step 3).

Return `valid: true` and attach `sanitizedExisting` via a side channel: easiest pattern is `validateParams` return `{ valid, error?, sanitizedExisting?, sessionIdValid? }` where `sessionIdValid` is true only when `event.sessionId` matches regex.

Alternatively merge sanitization inside `performSecurityCheck` after `validateParams` passes basic fields — plan: **do sanitization in `performSecurityCheck`** so `validateParams` stays focused on required fields; add new function `normalizeSessionAndExisting(event)` called from `performSecurityCheck`.

Concrete shape for `performSecurityCheck` return `data`:

```javascript
data: {
  openid,
  count: parseInt(event.count) || 1,
  difficulty: event.difficulty || 'medium',
  questionType: event.questionType || 'calculation',
  sanitizedExistingQuestions: sanitizeExistingQuestions(event.existingQuestions),
  sessionId: SESSION_ID_RE.test(String(event.sessionId || '')) ? event.sessionId : null,
  targetCount: parseInt(event.targetCount, 10)
}
```

- [ ] **Step 3: Session-scoped rate limit**

Before `checkRateLimit(openid)`:

- If `data.sessionId` is non-null:
  - Let `maxCalls = targetCount + 2` where `targetCount` comes from `parseInt(event.targetCount, 10)` (must be 1–10 on **first** registration for that `sessionId`; on later calls reuse stored `maxCalls`).
  - Store per `sessionId`: `{ maxCalls, used, expiresAt: now + SESSION_TTL_MS }`. Prune expired entries when touching the map.
  - On each accepted call in session mode: if `used >= maxCalls`, return `RATE_LIMITED`; else `used++`.
  - **Skip** `checkRateLimit(openid)` when session path applies.
- If `sessionId` invalid or missing, run existing `checkRateLimit` unchanged.

- [ ] **Step 4: Manual verify**

In WeChat DevTools, cloud function test:

1. Valid `sessionId` + `targetCount: 3`, `count: 1` — allow exactly **5** invocations (`3 + 2`); the **6th** must return `RATE_LIMITED`.
2. Invalid `sessionId` string — should use normal openid `checkRateLimit` behavior.

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/generateQuestions/security.js
git commit -m "feat(cloud): session-scoped limits and sanitize existingQuestions"
```

---

### Task 2: Cloud function — prompt, tokens, dedup

**Files:**
- Modify: `/Users/jerry/Documents/zdx_wx/cloudfunctions/generateQuestions/index.js`
- Modify: `/Users/jerry/Documents/zdx_wx/cloudfunctions/generateQuestions/security.js` (only if Task 1 missed exporting nothing — no change if done)

- [ ] **Step 1: Thread sanitized list and hints**

In `exports.main`, read from `securityResult.data`:

- `sanitizedExistingQuestions`
- `sessionId` (optional, for logging only)

Accept optional `event.prefetchHint` (string, max 80 chars): `String(event.prefetchHint || '').slice(0, 80)`.

- [ ] **Step 2: Update `buildUserPrompt`**

Signature: `(params)` where `params` includes `knowledgeName`, `grade`, `count`, `difficulty`, `questionType`, `existingSummaries` (array of strings), `prefetchHint`.

- Always generate **exactly** `count` in prompt (still 1 for progressive).
- If `existingSummaries.length`, append line: `已出过的题（不要重复）：` + join with `、`
- If `prefetchHint`, append line: `出题要求：` + prefetchHint

- [ ] **Step 3: `max_tokens` for single question**

In `callDeepSeekAPIOnce`, pass `max_tokens: params.count === 1 ? 300 : 800` — requires threading `count` into the call chain. Minimal change: add optional third argument or options object `{ maxTokens }` from `exports.main` based on `event.count`.

- [ ] **Step 4: Dedup after `parseResponse`**

After `parseResponse` returns `questions` array with one item for progressive flow:

```javascript
const norm = (s) => String(s || '').replace(/\s/g, '');
const isDup = (q, existing) =>
  existing.some((ex) => norm(ex) === norm(q.content));
```

If duplicate against `sanitizedExistingQuestions`, rebuild prompt with extra line `必须与已列题目完全不同。` and call `callDeepSeekAPI` **once more**. If still duplicate, return success with `duplicateWarning: true` in `meta` (spec).

- [ ] **Step 5: Manual verify**

Local/cloud debug: `count: 1`, `existingQuestions` containing the same text as forced mock — verify retry path (or log). Without mock, at least verify single-question response still parses.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/generateQuestions/index.js
git commit -m "feat(cloud): single-question prompt, dedup retry, prefetchHint"
```

---

### Task 3: Index page — first question only + UI cleanup

**Files:**
- Modify: `/Users/jerry/Documents/zdx_wx/pages/index/index.js`
- Modify: `/Users/jerry/Documents/zdx_wx/pages/index/index.wxml`
- Modify: `/Users/jerry/Documents/zdx_wx/pages/index/index.wxss`

- [ ] **Step 1: Regex-safe `sessionId` helper**

In `index.js` (top-level function):

```javascript
function buildSessionId() {
  const ts = Date.now();
  let suffix = '';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `sess_${ts}_${suffix}`;
}
```

- [ ] **Step 2: Change `handleGenerate` cloud payload**

Replace `count: selectedCount` with:

```javascript
const sessionId = buildSessionId();
const res = await wx.cloud.callFunction({
  name: 'generateQuestions',
  data: {
    knowledgeId: selectedKnowledge.id,
    knowledgeName: selectedKnowledge.name,
    grade: '五年级',
    count: 1,
    targetCount: selectedCount,
    difficulty: selectedDifficulty,
    questionType: 'calculation',
    existingQuestions: [],
    sessionId
  }
});
```

On success, set:

```javascript
app.globalData.currentQuestions = {
  questions: result.questions,
  knowledge: selectedKnowledge,
  meta: result.meta,
  generateParams: {
    knowledgeId: selectedKnowledge.id,
    knowledgeName: selectedKnowledge.name,
    grade: '五年级',
    difficulty: selectedDifficulty,
    questionType: 'calculation',
    targetCount: selectedCount,
    sessionId
  }
};
```

- [ ] **Step 3: WXML — remove duck and mask**

In `pages/index/index.wxml`:

- Delete the `<image ... class="generate-duck" ...>` inside the generate button.
- Delete the entire `<view class="loading-mask" wx:if="{{generating}}">...</view>` block.

- [ ] **Step 4: WXSS — remove rules**

Delete `.generate-duck`, `.loading-mask`, `.loading-box`, `.loading-text`, `.loading-sub` blocks from `pages/index/index.wxss`.

- [ ] **Step 5: Manual verify**

Tap generate: only button shows loading text; no full-screen mask; navigate to practice with one question.

- [ ] **Step 6: Commit**

```bash
git add pages/index/index.js pages/index/index.wxml pages/index/index.wxss
git commit -m "feat(index): single-question generate, remove duck and loading mask"
```

---

### Task 4: Practice page — progressive prefetch core

**Files:**
- Modify: `/Users/jerry/Documents/zdx_wx/pages/practice/practice.js`
- Modify: `/Users/jerry/Documents/zdx_wx/pages/practice/practice.wxml`
- Modify: `/Users/jerry/Documents/zdx_wx/pages/practice/practice.wxss`

- [ ] **Step 1: Add `waitingForNext` to `data`**

In `Page({ data: { ... } })` add `waitingForNext: false`.

- [ ] **Step 2: `onLoad` init for `source === 'generated'`**

When `source === 'generated' && app.globalData.currentQuestions`:

- Read `data = app.globalData.currentQuestions`
- If `!data.generateParams` or missing `targetCount`, fallback to old behavior: `loadQuestionsFromData(data)` only (no prefetch).
- Else set instance state:

```javascript
this.generateParams = data.generateParams;
this.targetCount = data.generateParams.targetCount;
this.generatedCount = 1;
this.pendingRequests = 0;
this.questionQueue = [];
this.destroyed = false;
this.consecutiveFailures = 0;
const rawFirst = (data.questions && data.questions[0]) ? data.questions[0] : null;
this.allExistingContents = rawFirst && rawFirst.content
  ? [String(rawFirst.content)]
  : [];
```

- Format first batch with new `formatSingleQuestion` (Step 3).
- `setData` with `questions: [formattedFirst]`, `totalQuestions: this.targetCount`, `currentQuestion`, `progressPercent`, `knowledgeInfo`, `meta`, `practiceType`, `waitingForNext: false`.
- Call `this.prefetchQuestions()` in `setData` callback or `wx.nextTick`-style `setTimeout(..., 0)` to ensure state is flushed.

- [ ] **Step 3: Extract `formatSingleQuestion(q)`**

Move mapping from `loadQuestionsFromData` into:

```javascript
formatSingleQuestion: function (q) {
  return {
    id: q.id || Date.now() + Math.random(),
    question: q.content,
    answer: q.answer,
    type: q.type || '计算题',
    typeName: q.type || '计算题',
    difficulty: this.getDifficultyLevel(q.difficulty),
    difficultyText: q.difficulty || '中等',
    hint: q.tip || '',
    explanation: q.solution || ''
  };
},
```

Update `loadQuestionsFromData` to use `questions.map(q => this.formatSingleQuestion(q))` (non-generated paths unchanged semantically).

- [ ] **Step 4: Implement `prefetchQuestions`**

Use instance fields only. Logic from spec §3.4:

```javascript
prefetchQuestions: function () {
  if (this.destroyed) return;
  const remaining =
    this.targetCount - this.generatedCount - this.pendingRequests;
  if (remaining <= 0) return;
  const buffer = this.questionQueue.length + this.pendingRequests;
  if (buffer >= 2) return;
  const needed = Math.max(0, Math.min(2 - buffer, remaining));
  if (needed <= 0) return;
  for (let i = 0; i < needed; i++) {
    this.pendingRequests += 1;
    const hint = `变式${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    this.callGenerateOne(hint);
  }
},
```

- [ ] **Step 5: Implement `callGenerateOne(prefetchHint)`**

```javascript
callGenerateOne: function (prefetchHint) {
  const gp = this.generateParams;
  if (!gp) return;
  wx.cloud.callFunction({
    name: 'generateQuestions',
    data: {
      knowledgeId: gp.knowledgeId,
      knowledgeName: gp.knowledgeName,
      grade: gp.grade,
      count: 1,
      targetCount: gp.targetCount,
      difficulty: gp.difficulty,
      questionType: gp.questionType,
      existingQuestions: [...this.allExistingContents],
      sessionId: gp.sessionId,
      prefetchHint
    },
    success: (res) => this.onPrefetchResult(res.result),
    fail: (err) => this.onPrefetchResult({ success: false, error: err.errMsg || '网络错误' })
  });
},
```

- [ ] **Step 6: Implement `onPrefetchResult(result)`**

- If `this.destroyed`, return (still decrement `pendingRequests` if you incremented — **must** decrement in `finally`-style at start after guard? Spec: decrement always when response returns. Use try/finally pattern:

```javascript
onPrefetchResult: function (result) {
  if (this.destroyed) {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    return;
  }
  this.pendingRequests = Math.max(0, this.pendingRequests - 1);
  // ... success / failure branches from spec §3.5
};
```

Success branch:

- Validate `result.questions && result.questions[0]`
- `formatted = this.formatSingleQuestion(result.questions[0])`
- Client dedup: `norm(q) === norm(existing)` against `allExistingContents` — if dup, `prefetchQuestions()` and return
- Push `String(result.questions[0].content)` to `allExistingContents`, `generatedCount++`, `consecutiveFailures = 0`
- `setData` append to `questions`: `questions: [...this.data.questions, formatted]`
- `this.questionQueue.push(formatted)`
- If `this.data.waitingForNext`, call `showNextFromQueue()`
- `prefetchQuestions()`

Failure branch:

- `consecutiveFailures++`
- If `< 2`, `prefetchQuestions()`
- If `>= 2`, `wx.showToast({ title: '部分题目生成失败', icon: 'none' })`, set `this.targetCount = this.generatedCount`, `setData({ totalQuestions: this.generatedCount })`, if `waitingForNext` and no more questions incoming, call `goToResult()` or show message — **spec:** end session with current questions; if user was waiting and `questionQueue` empty and `pendingRequests === 0`, navigate to result.

- [ ] **Step 7: `showNextFromQueue`**

```javascript
showNextFromQueue: function () {
  const next = this.questionQueue.shift();
  if (!next) return;
  const idx = this.data.waitingForNext
    ? this.data.currentIndex
    : this.data.currentIndex + 1;
  const total = this.data.totalQuestions;
  this.setData({
    currentQuestion: next,
    currentIndex: idx,
    progressPercent: total ? ((idx + 1) / total) * 100 : 0,
    waitingForNext: false
  });
},
```

- [ ] **Step 8: Rewrite `handleNext` for progressive mode**

Detect progressive mode with `this.generateParams` truthy.

```javascript
handleNext: function () {
  const { currentIndex, totalQuestions } = this.data;

  this.setData({
    showFeedback: false,
    showHint: false,
    userAnswer: ''
  });

  if (!this.generateParams) {
    // legacy path — keep existing behavior
    this.setData({
      currentIndex: currentIndex + 1,
      progressPercent: ((currentIndex + 1) / totalQuestions) * 100
    });
    if (currentIndex + 1 >= totalQuestions) {
      this.goToResult();
    } else {
      this.setData({
        currentQuestion: this.data.questions[currentIndex + 1]
      });
    }
    return;
  }

  const nextIndex = currentIndex + 1;
  const done =
    nextIndex >= this.generatedCount &&
    this.pendingRequests === 0 &&
    this.questionQueue.length === 0;

  if (done) {
    this.goToResult();
    return;
  }

  if (this.questionQueue.length > 0) {
    this.showNextFromQueue();
    this.prefetchQuestions();
    return;
  }

  this.setData({
    waitingForNext: true,
    currentIndex: nextIndex,
    progressPercent: totalQuestions
      ? ((nextIndex + 1) / totalQuestions) * 100
      : 0
  });
},
```

**Important:** When `waitingForNext` is true, hide the question card (wxml); user should not submit again until next arrives.

- [ ] **Step 8b: Guard `handleSubmit`**

At the top of `handleSubmit`:

```javascript
if (this.data.waitingForNext) return;
if (!this.data.currentQuestion) return;
```

- [ ] **Step 9: `onUnload`**

```javascript
onUnload: function () {
  this.destroyed = true;
  app.globalData.currentQuestions = null;
},
```

Keep any existing `onUnload` body merged (old practice page had a comment-only block).

- [ ] **Step 10: WXML waiting UI**

Wrap question card:

```xml
<view class="waiting-card" wx:if="{{waitingForNext}}">
  <image class="waiting-duck" src="/images/duck-avatar.png" mode="aspectFit"></image>
  <text class="waiting-text">下一题准备中...</text>
</view>
<view class="question-card" wx:elif="{{currentQuestion}}">
  ... existing content ...
</view>
```

- [ ] **Step 11: WXSS**

Match `.question-card` width/padding/radius from `practice.wxss` (copy key layout properties for `.waiting-card`, `.waiting-duck`, `.waiting-text`).

- [ ] **Step 12: Manual end-to-end**

1. Generate 5 questions — first screen fast; answer slowly — no wait.
2. Answer very fast — brief waiting card may appear; then next question.
3. Back from practice — re-enter generate — ensure no stale `globalData`.

- [ ] **Step 13: Commit**

```bash
git add pages/practice/practice.js pages/practice/practice.wxml pages/practice/practice.wxss
git commit -m "feat(practice): progressive prefetch and waiting state"
```

---

## Self-review (spec coverage)

| Spec section | Tasks |
|--------------|-------|
| §1 Cloud params + dedup + max_tokens | Task 1–2 |
| §1.4 session + existingQuestions limits | Task 1 |
| §2 Index + UI | Task 3 |
| §3 Practice queue, prefetch, handleNext, unload | Task 4 |
| §3.8 waiting UI | Task 4 Step 10–11 |
| Error table | Task 4 Step 6–8 (failure + waiting) |

**Gap closed:** `handleSubmit` must ignore submit while `waitingForNext` — Task 4 Step 8b.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-02-progressive-question-generation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you want?
