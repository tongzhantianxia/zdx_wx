# 题库系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a question bank system that serves pre-stored questions first, falling back to AI generation when the bank is exhausted, with 30-day per-user dedup.

**Architecture:** New cloud function `getQuestions` orchestrates: query `question_bank` → exclude done IDs from `user_knowledge_done` → return bank questions or fallback to existing `generateQuestions`. Offline scripts crawl, rewrite, and import questions.

**Tech Stack:** WeChat Cloud Development (wx.cloud), Cloud Database (MongoDB), OpenAI SDK (Qwen via DashScope), Node.js scripts

**Spec:** `docs/superpowers/specs/2026-04-02-question-bank-system-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `cloudfunctions/getQuestions/index.js` | Main orchestrator: bank query + dedup + AI fallback |
| Create | `cloudfunctions/getQuestions/package.json` | Dependencies: wx-server-sdk |
| Create | `cloudfunctions/getQuestions/bankQuery.js` | DB query logic: fetch from bank, exclude done IDs, $sample |
| Create | `cloudfunctions/getQuestions/userLog.js` | Read/write user_knowledge_done and user_question_log |
| Modify | `cloudfunctions/generateQuestions/index.js` | Add `_internal` flag to skip auth/rate-limit for internal calls |
| Modify | `pages/index/index.js:190` | Change cloud function name from `generateQuestions` to `getQuestions` |
| Modify | `pages/practice/practice.js:167-168` | Change cloud function name in `prefetchQuestions` + add answeredAt/isCorrect writeback |
| Create | `cloudfunctions/cleanExpiredLogs/index.js` | Scheduled: clean expired dedup data (>30d) |
| Create | `cloudfunctions/cleanExpiredLogs/package.json` | Dependencies: wx-server-sdk |
| Create | `scripts/config.js` | Crawl targets, API key, DB config |
| Create | `scripts/crawl.js` | Crawl public exam sites → raw_questions/*.json |
| Create | `scripts/rewrite.js` | AI rewrite + verify → rewritten_questions/*.json |
| Create | `scripts/import.js` | Batch import to cloud DB |

---

### Task 1: Create `getQuestions` cloud function scaffold

**Files:**
- Create: `cloudfunctions/getQuestions/package.json`
- Create: `cloudfunctions/getQuestions/index.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "getQuestions",
  "version": "1.0.0",
  "description": "题库优先出题，AI fallback",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

Write to `cloudfunctions/getQuestions/package.json`.

- [ ] **Step 2: Create minimal index.js with security + stub**

Write to `cloudfunctions/getQuestions/index.js`:

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const TYPE_MAP = { calculation: '计算题', fillBlank: '填空题', application: '应用题' };

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return { success: false, error: '请先登录后再使用', code: 'UNAUTHORIZED' };
  }

  const { knowledgeId, knowledgeName, grade, count = 1, difficulty = 'medium', questionType = 'calculation' } = event;

  if (!knowledgeId || !knowledgeName) {
    return { success: false, error: '缺少知识点参数', code: 'INVALID_PARAMS' };
  }

  const numCount = parseInt(count, 10);
  if (isNaN(numCount) || numCount < 1 || numCount > 10) {
    return { success: false, error: '题目数量必须在 1-10 之间', code: 'INVALID_PARAMS' };
  }

  // TODO: Task 2 — bankQuery
  // TODO: Task 3 — AI fallback
  // TODO: Task 4 — userLog

  return { success: false, error: '功能开发中', code: 'NOT_IMPLEMENTED' };
};
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/getQuestions/
git commit -m "feat(getQuestions): scaffold cloud function with param validation"
```

---

### Task 2: Implement bank query module

**Files:**
- Create: `cloudfunctions/getQuestions/bankQuery.js`

- [ ] **Step 1: Write bankQuery.js**

Write to `cloudfunctions/getQuestions/bankQuery.js`:

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 从题库查询可用题目（排除已做，按题型过滤）
 * @param {object} params
 * @param {string} params.knowledgeId
 * @param {string} params.questionType - calculation/fillBlank/application
 * @param {string} params.difficulty - easy/medium/hard
 * @param {string[]} params.doneIds - 已做题目ID
 * @param {number} params.count - 需要的题目数量
 * @returns {Promise<Array>} 题目数组
 */
async function queryBank({ knowledgeId, questionType, difficulty, doneIds, count }) {
  const baseCond = { knowledgeId, questionType };
  if (doneIds.length > 0) {
    baseCond._id = _.nin(doneIds);
  }

  const ADJACENT = { easy: ['easy', 'medium'], medium: ['easy', 'medium', 'hard'], hard: ['medium', 'hard'] };

  // 1. 精确难度 + 已验证优先
  let questions = await sampleQuestions({ ...baseCond, difficulty, verified: true }, count);
  if (questions.length >= count) return questions.slice(0, count);

  // 2. 精确难度 + 未验证
  if (questions.length < count) {
    const excludeIds = doneIds.concat(questions.map(q => q._id));
    const more = await sampleQuestions(
      { ...baseCond, difficulty, verified: false, _id: _.nin(excludeIds) },
      count - questions.length
    );
    questions = questions.concat(more);
  }
  if (questions.length >= count) return questions.slice(0, count);

  // 3. 相邻难度
  const adjacentDiffs = (ADJACENT[difficulty] || [difficulty]).filter(d => d !== difficulty);
  if (adjacentDiffs.length > 0 && questions.length < count) {
    const excludeIds = doneIds.concat(questions.map(q => q._id));
    const more = await sampleQuestions(
      { knowledgeId, questionType, difficulty: _.in(adjacentDiffs), _id: _.nin(excludeIds) },
      count - questions.length
    );
    questions = questions.concat(more);
  }

  return questions.slice(0, count);
}

async function sampleQuestions(condition, size) {
  if (size <= 0) return [];
  try {
    const res = await db.collection('question_bank')
      .aggregate()
      .match(condition)
      .sample({ size })
      .end();
    return res.list || [];
  } catch (e) {
    console.error('[bankQuery] aggregate error:', e.message);
    return [];
  }
}

module.exports = { queryBank };
```

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/getQuestions/bankQuery.js
git commit -m "feat(getQuestions): bank query with difficulty fallback and $sample"
```

---

### Task 3: Implement user log module

**Files:**
- Create: `cloudfunctions/getQuestions/userLog.js`

- [ ] **Step 1: Write userLog.js**

Write to `cloudfunctions/getQuestions/userLog.js`:

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 获取用户某知识点已做题目 ID 列表
 */
async function getDoneIds(openid, knowledgeId) {
  try {
    const res = await db.collection('user_knowledge_done')
      .where({ openid, knowledgeId })
      .limit(1)
      .get();

    if (res.data.length > 0) {
      return res.data[0].doneQuestionIds || [];
    }
    return [];
  } catch (e) {
    console.error('[userLog] getDoneIds error:', e.message);
    return [];
  }
}

/**
 * 记录出题日志 + 更新去重辅助表
 * @param {string} openid
 * @param {string} knowledgeId
 * @param {Array} questions - 本次返回的题目（含 _bankId）
 */
async function recordServed(openid, knowledgeId, questions) {
  const now = new Date();
  const bankIds = questions.map(q => q._bankId).filter(Boolean);

  // 1. 批量写 user_question_log
  const logRecords = questions.map(q => ({
    openid,
    questionId: q._bankId || null,
    knowledgeId,
    servedAt: now,
    answeredAt: null,
    isCorrect: null
  }));

  try {
    const tasks = logRecords.map(r => db.collection('user_question_log').add({ data: r }));
    await Promise.all(tasks);
  } catch (e) {
    console.error('[userLog] batch log error:', e.message);
  }

  // 2. 更新 user_knowledge_done（upsert）
  if (bankIds.length === 0) return;

  try {
    const existing = await db.collection('user_knowledge_done')
      .where({ openid, knowledgeId })
      .limit(1)
      .get();

    if (existing.data.length > 0) {
      await db.collection('user_knowledge_done').doc(existing.data[0]._id).update({
        data: {
          doneQuestionIds: _.push(bankIds),
          lastUpdated: now
        }
      });
    } else {
      await db.collection('user_knowledge_done').add({
        data: {
          openid,
          knowledgeId,
          doneQuestionIds: bankIds,
          lastUpdated: now
        }
      });
    }
  } catch (e) {
    console.error('[userLog] upsert done error:', e.message);
  }
}

module.exports = { getDoneIds, recordServed };
```

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/getQuestions/userLog.js
git commit -m "feat(getQuestions): user log and dedup helper module"
```

---

### Task 4: Adapt `generateQuestions` for internal calls

**Files:**
- Modify: `cloudfunctions/generateQuestions/index.js:83-98`

- [ ] **Step 0: Export `checkSessionCallLimit` from security.js**

In `cloudfunctions/generateQuestions/security.js`, add `checkSessionCallLimit` to the exports at line 350-357:

```javascript
// From:
module.exports = {
  checkRateLimit,
  validateParams,
  checkAuth,
  performSecurityCheck,
  sanitizeExistingQuestions,
  VALID_KNOWLEDGE_IDS,
  SESSION_ID_RE
};
// To:
module.exports = {
  checkRateLimit,
  checkSessionCallLimit,
  validateParams,
  checkAuth,
  performSecurityCheck,
  sanitizeExistingQuestions,
  VALID_KNOWLEDGE_IDS,
  SESSION_ID_RE
};
```

- [ ] **Step 1: Add `_internal` bypass in generateQuestions**

In `cloudfunctions/generateQuestions/index.js`, replace the security check block (lines 83-98):

```javascript
// Current code:
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  ...
  const securityResult = performSecurityCheck(event, wxContext);
  if (!securityResult.passed) {
    return {
      success: false,
      error: securityResult.error,
      code: securityResult.code,
      waitTime: securityResult.waitTime
    };
  }
```

Replace with:

```javascript
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const totalStart = Date.now();
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[generateQuestions] 开始:', JSON.stringify({ requestId, event }));

  let securityData;

  if (event._internal === true) {
    // 内部调用（来自 getQuestions），跳过鉴权和全局频率限制
    // 仍保留参数校验和 session 限制
    const { validateParams, sanitizeExistingQuestions, checkSessionCallLimit, SESSION_ID_RE } = require('./security');
    const vResult = validateParams(event);
    if (!vResult.valid) {
      return { success: false, error: vResult.error, code: 'INVALID_PARAMS' };
    }
    const sessionIdRaw = String(event.sessionId || '').trim();
    const validSessionId = SESSION_ID_RE.test(sessionIdRaw) ? sessionIdRaw : null;
    if (validSessionId) {
      const sessionLimit = checkSessionCallLimit(validSessionId, event.targetCount);
      if (!sessionLimit.allowed) {
        return { success: false, error: sessionLimit.error, code: sessionLimit.code || 'RATE_LIMITED', waitTime: sessionLimit.waitTime };
      }
    }
    securityData = {
      openid: event._openid || 'internal',
      count: parseInt(event.count, 10) || 1,
      difficulty: event.difficulty || 'medium',
      questionType: event.questionType || 'calculation',
      sanitizedExistingQuestions: sanitizeExistingQuestions(event.existingQuestions),
      sessionId: validSessionId,
      targetCount: parseInt(event.targetCount, 10) || null
    };
  } else {
    const securityResult = performSecurityCheck(event, wxContext);
    if (!securityResult.passed) {
      return {
        success: false,
        error: securityResult.error,
        code: securityResult.code,
        waitTime: securityResult.waitTime
      };
    }
    securityData = securityResult.data;
  }
```

Then replace all subsequent `securityResult.data` references with `securityData`. Specifically change line 118:

```javascript
// From:
const { count, difficulty, questionType, sanitizedExistingQuestions } = securityResult.data;
// To:
const { count, difficulty, questionType, sanitizedExistingQuestions } = securityData;
```

- [ ] **Step 2: Verify the file parses without errors**

Run: `node -c cloudfunctions/generateQuestions/index.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/generateQuestions/index.js cloudfunctions/generateQuestions/security.js
git commit -m "feat(generateQuestions): support _internal flag for getQuestions fallback"
```

---

### Task 5: Wire up getQuestions orchestration

**Files:**
- Modify: `cloudfunctions/getQuestions/index.js`

- [ ] **Step 1: Implement full orchestration in index.js**

Replace the entire content of `cloudfunctions/getQuestions/index.js` with:

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { queryBank } = require('./bankQuery');
const { getDoneIds, recordServed } = require('./userLog');

const TYPE_MAP = { calculation: '计算题', fillBlank: '填空题', application: '应用题' };

function formatBankQuestion(q, index) {
  return {
    id: index + 1,
    type: TYPE_MAP[q.questionType] || q.questionType || '计算题',
    content: String(q.content || '').trim(),
    answer: String(q.answer || '').trim(),
    solution: String(q.solution || '').trim(),
    tip: String(q.tip || '').trim(),
    _bankId: q._id
  };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const totalStart = Date.now();

  if (!openid) {
    return { success: false, error: '请先登录后再使用', code: 'UNAUTHORIZED' };
  }

  const {
    knowledgeId, knowledgeName, grade,
    count = 1, targetCount, difficulty = 'medium',
    questionType = 'calculation', existingQuestions = [], sessionId
  } = event;

  if (!knowledgeId || !knowledgeName) {
    return { success: false, error: '缺少知识点参数', code: 'INVALID_PARAMS' };
  }

  const numCount = parseInt(count, 10);
  if (isNaN(numCount) || numCount < 1 || numCount > 10) {
    return { success: false, error: '题目数量必须在 1-10 之间', code: 'INVALID_PARAMS' };
  }

  try {
    // ① 获取已做题目 ID
    const doneIds = await getDoneIds(openid, knowledgeId);

    // ② 从题库查询
    const bankQuestions = await queryBank({ knowledgeId, questionType, difficulty, doneIds, count: numCount });

    const formatted = bankQuestions.map((q, i) => formatBankQuestion(q, i));
    const sources = [];
    let allQuestions = [];

    if (formatted.length >= numCount) {
      allQuestions = formatted.slice(0, numCount);
      sources.push('question_bank');
    } else {
      if (formatted.length > 0) sources.push('question_bank');

      // ③ AI fallback
      const aiNeeded = numCount - formatted.length;
      try {
        const aiResult = await cloud.callFunction({
          name: 'generateQuestions',
          data: {
            _internal: true,
            _openid: openid,
            knowledgeId,
            knowledgeName,
            grade: grade || '五年级',
            count: aiNeeded,
            targetCount: targetCount || numCount,
            difficulty,
            questionType,
            existingQuestions,
            sessionId
          }
        });

        const aiData = aiResult.result;
        if (aiData && aiData.success && aiData.questions) {
          const aiFormatted = aiData.questions.map((q, i) => ({
            ...q,
            id: formatted.length + i + 1,
            _bankId: null
          }));
          allQuestions = formatted.concat(aiFormatted);
          sources.push('ai_generated');

          // 回填 AI 题到题库（异步，不阻塞返回）
          backfillAiQuestions(knowledgeId, knowledgeName, grade, difficulty, questionType, aiData.questions);
        } else {
          allQuestions = formatted;
        }
      } catch (aiErr) {
        console.error('[getQuestions] AI fallback error:', aiErr.message);
        allQuestions = formatted;
      }
    }

    if (allQuestions.length === 0) {
      return { success: false, error: '暂无可用题目，请稍后再试', code: 'NO_QUESTIONS' };
    }

    // ④ 记录出题日志
    await recordServed(openid, knowledgeId, allQuestions);

    return {
      success: true,
      questions: allQuestions,
      meta: {
        knowledgeId,
        knowledgeName,
        grade,
        count: allQuestions.length,
        sources,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('[getQuestions] error:', error.message);
    return { success: false, error: '出题失败，请稍后重试', code: 'GENERATE_ERROR' };
  }
};

/**
 * 异步回填 AI 生成的题到题库（不阻塞主流程）
 */
function backfillAiQuestions(knowledgeId, knowledgeName, grade, difficulty, questionType, questions) {
  const db = cloud.database();
  const now = new Date();

  const tasks = questions.map(q =>
    db.collection('question_bank').add({
      data: {
        knowledgeId,
        knowledgeName,
        grade: grade || '五年级',
        semester: '',
        unit: 0,
        questionType: questionType || 'calculation',
        difficulty: difficulty || 'medium',
        content: q.content,
        answer: q.answer,
        solution: q.solution || '',
        tip: q.tip || '',
        source: 'ai_realtime',
        verified: false,
        createdAt: now,
        updatedAt: now
      }
    }).catch(e => console.error('[backfill] error:', e.message))
  );

  Promise.all(tasks).catch(() => {});
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c cloudfunctions/getQuestions/index.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/getQuestions/
git commit -m "feat(getQuestions): full orchestration — bank query, dedup, AI fallback, backfill"
```

---

### Task 6: Update frontend to call `getQuestions`

**Files:**
- Modify: `pages/index/index.js:190-191`
- Modify: `pages/practice/practice.js:167-168`

- [ ] **Step 1: Update index.js**

In `pages/index/index.js`, change line 190-191:

```javascript
// From:
name: 'generateQuestions',
// To:
name: 'getQuestions',
```

- [ ] **Step 2: Update practice.js — cloud function name**

In `pages/practice/practice.js`, change line 167-168:

```javascript
// From:
name: 'generateQuestions',
// To:
name: 'getQuestions',
```

- [ ] **Step 3: Add answeredAt/isCorrect writeback in practice.js**

In `pages/practice/practice.js`, find the section where the user submits an answer and results are calculated (the `submitAnswer` or equivalent function that sets `isCorrect`). After determining whether the answer is correct, add a cloud function call to update the question log:

```javascript
// After determining isCorrect for a question:
if (currentQuestion._bankId) {
  wx.cloud.callFunction({
    name: 'updateQuestionLog',
    data: {
      questionId: currentQuestion._bankId,
      knowledgeId: this.generateParams.knowledgeId,
      isCorrect: isCorrect
    }
  }).catch(err => console.error('updateLog error:', err));
}
```

Alternatively, if a dedicated cloud function is too heavy, add the update logic to `getQuestions` as a secondary endpoint (event.action === 'updateLog'). The simpler approach: add an `updateLog` action to `getQuestions/index.js`:

In `cloudfunctions/getQuestions/index.js`, after `openid` is resolved and the unauthorized check passes (i.e. after the `if (!openid)` block), add:

```javascript
if (event.action === 'updateLog') {
  return await handleUpdateLog(event, openid);
}
```

And add this function before `exports.main`:

```javascript
async function handleUpdateLog(event, openid) {
  const db = cloud.database();
  const { questionId, knowledgeId, isCorrect } = event;
  if (!questionId || !knowledgeId) {
    return { success: false, error: '缺少参数' };
  }
  try {
    const logs = await db.collection('user_question_log')
      .where({ openid, questionId, knowledgeId, answeredAt: null })
      .orderBy('servedAt', 'desc')
      .limit(1)
      .get();
    if (logs.data.length > 0) {
      await db.collection('user_question_log').doc(logs.data[0]._id).update({
        data: { answeredAt: new Date(), isCorrect: !!isCorrect }
      });
    }
    return { success: true };
  } catch (e) {
    console.error('[updateLog] error:', e.message);
    return { success: false, error: e.message };
  }
}
```

In `pages/practice/practice.js`, after each answer is evaluated, call:

```javascript
wx.cloud.callFunction({
  name: 'getQuestions',
  data: {
    action: 'updateLog',
    questionId: currentQuestion._bankId,
    knowledgeId: gp.knowledgeId,
    isCorrect: isCorrect
  }
}).catch(() => {});
```

- [ ] **Step 4: Verify no remaining references to old function name in frontend**

Run: `rg "name: 'generateQuestions'" pages/`
Expected: no matches

- [ ] **Step 5: Commit**

```bash
git add pages/index/index.js pages/practice/practice.js
git commit -m "feat: switch frontend to getQuestions cloud function"
```

---

### Task 7: Create crawl script

**Files:**
- Create: `scripts/config.js`
- Create: `scripts/crawl.js`

- [ ] **Step 1: Write config.js**

Write to `scripts/config.js`:

```javascript
module.exports = {
  apiKey: process.env.QWEN_API_KEY || '',
  model: process.env.QWEN_MODEL || 'qwen-turbo',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',

  crawlTargets: [
    {
      name: '学科网免费区',
      baseUrl: 'https://www.zxxk.com',
      searchPath: '/soft/free',
      enabled: true
    }
  ],

  crawlDelay: { min: 2000, max: 5000 },

  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],

  outputDirs: {
    raw: 'raw_questions',
    rewritten: 'rewritten_questions'
  },

  perKnowledgeTarget: 30
};
```

- [ ] **Step 2: Write crawl.js skeleton**

Write to `scripts/crawl.js`. This is a skeleton that reads knowledgeData and creates the output structure. Actual crawl logic depends on target site HTML — the user will need to customize selectors.

```javascript
const fs = require('fs');
const path = require('path');
const config = require('./config');

const knowledgeDataPath = path.join(__dirname, '..', 'utils', 'knowledgeData.js');
const { getAllKnowledges } = require(knowledgeDataPath);

const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const RAW_DIR = path.join(__dirname, config.outputDirs.raw);

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {};
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  const { min, max } = config.crawlDelay;
  return min + Math.floor(Math.random() * (max - min));
}

async function crawlForKnowledge(knowledge) {
  // TODO: Implement actual crawl logic per target site
  // This skeleton logs intent and creates empty output files
  console.log(`  [crawl] ${knowledge.id} - ${knowledge.name} — 需要自定义爬虫逻辑`);
  return [];
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

  const allKnowledges = getAllKnowledges();
  const progress = loadProgress();

  console.log(`共 ${allKnowledges.length} 个知识点，开始爬取...\n`);

  for (const k of allKnowledges) {
    if (progress[k.id] && progress[k.id].status === 'crawled') {
      console.log(`[skip] ${k.id} 已爬取`);
      continue;
    }

    console.log(`[crawl] ${k.id} - ${k.name} (${k.semester})`);
    const questions = await crawlForKnowledge(k);

    const outFile = path.join(RAW_DIR, `${k.id}.json`);
    fs.writeFileSync(outFile, JSON.stringify(questions, null, 2));

    progress[k.id] = { status: 'crawled', crawled: questions.length };
    saveProgress(progress);

    await sleep(randomDelay());
  }

  console.log('\n爬取完成。');
}

main().catch(console.error);
```

- [ ] **Step 3: Commit**

```bash
git add scripts/
git commit -m "feat(scripts): crawl skeleton with config and progress tracking"
```

---

### Task 8: Create rewrite script

**Files:**
- Create: `scripts/rewrite.js`

- [ ] **Step 1: Write rewrite.js**

Write to `scripts/rewrite.js`:

```javascript
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const config = require('./config');

const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const RAW_DIR = path.join(__dirname, config.outputDirs.raw);
const OUT_DIR = path.join(__dirname, config.outputDirs.rewritten);

const client = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL
});

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  return {};
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const REWRITE_PROMPT = (knowledgeName, questionType, content, answer) => `你是小学数学题改编专家。请改写以下数学题：
- 保留：知识点（${knowledgeName}）、题型（${questionType}）、难度、解题思路
- 必须替换：所有数值、人名、物品名称、生活场景
- 不能仅替换数字，必须变换整个情境
- 重新计算答案并给出完整解题步骤

原题：${content}
原答案：${answer}

输出JSON：{"content":"改写后的题目","answer":"新答案","solution":"解题步骤","tip":"易错提示"}`;

async function rewriteQuestion(knowledgeName, questionType, q) {
  const prompt = REWRITE_PROMPT(knowledgeName, questionType, q.content, q.answer);

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 500,
    enable_thinking: false
  });

  const raw = completion.choices?.[0]?.message?.content || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');

  return JSON.parse(match[0]);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!config.apiKey) { console.error('Missing QWEN_API_KEY'); process.exit(1); }

  const progress = loadProgress();
  const rawFiles = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));

  for (const file of rawFiles) {
    const kid = file.replace('.json', '');
    if (progress[kid]?.status === 'rewritten' || progress[kid]?.status === 'imported') {
      console.log(`[skip] ${kid}`);
      continue;
    }

    const rawQuestions = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf-8'));
    if (rawQuestions.length === 0) { console.log(`[empty] ${kid}`); continue; }

    console.log(`[rewrite] ${kid} — ${rawQuestions.length} 题`);
    const results = [];
    let failed = 0;

    for (const q of rawQuestions) {
      try {
        const rewritten = await rewriteQuestion(q.knowledgeName || kid, q.questionType || 'calculation', q);
        results.push({ ...rewritten, originalContent: q.content });
        console.log(`  ✓ ${results.length}/${rawQuestions.length}`);
      } catch (e) {
        failed++;
        console.log(`  ✗ failed: ${e.message}`);
      }
      await sleep(1000);
    }

    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(results, null, 2));
    progress[kid] = { ...progress[kid], status: 'rewritten', rewritten: results.length, failed };
    saveProgress(progress);
  }

  console.log('\n改写完成。');
}

main().catch(console.error);
```

- [ ] **Step 2: Add openai to scripts dependencies**

Run: `cd scripts && npm init -y && npm install openai`

- [ ] **Step 3: Commit**

```bash
git add scripts/
git commit -m "feat(scripts): AI rewrite pipeline with progress tracking"
```

---

### Task 9: Create import script

**Files:**
- Create: `scripts/import.js`

- [ ] **Step 1: Write import.js**

Write to `scripts/import.js`:

```javascript
const fs = require('fs');
const path = require('path');
const config = require('./config');

const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const OUT_DIR = path.join(__dirname, config.outputDirs.rewritten);

// Uses wx-server-sdk cloud.database() — must be run via cloud function
// or tcb CLI. This script outputs a JSON array ready for cloud DB import.

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  return {};
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

const knowledgeDataPath = path.join(__dirname, '..', 'utils', 'knowledgeData.js');
const { getKnowledgeById } = require(knowledgeDataPath);

async function main() {
  const progress = loadProgress();
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'));
  const allRecords = [];

  for (const file of files) {
    const kid = file.replace('.json', '');
    if (progress[kid]?.status === 'imported') {
      console.log(`[skip] ${kid}`);
      continue;
    }

    const kInfo = getKnowledgeById(kid);
    const questions = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), 'utf-8'));
    const now = new Date().toISOString();

    for (const q of questions) {
      allRecords.push({
        knowledgeId: kid,
        knowledgeName: kInfo?.name || kid,
        grade: kInfo?.semester?.replace(/[上下]册/, '') || '',
        semester: kInfo?.semester || '',
        unit: kInfo?.unit || 0,
        questionType: 'calculation',
        difficulty: 'medium',
        content: q.content,
        answer: q.answer,
        solution: q.solution || '',
        tip: q.tip || '',
        source: 'rewritten_exam',
        verified: true,
        createdAt: now,
        updatedAt: now
      });
    }

    progress[kid] = { ...progress[kid], status: 'imported', imported: questions.length };
    saveProgress(progress);
    console.log(`[import] ${kid} — ${questions.length} 题`);
  }

  // Output for cloud DB import (use tcb CLI: tcb database import)
  const outFile = path.join(__dirname, 'import_data.json');
  const lines = allRecords.map(r => JSON.stringify(r));
  fs.writeFileSync(outFile, lines.join('\n'));

  console.log(`\n导出完成: ${allRecords.length} 条 → ${outFile}`);
  console.log('使用 tcb database import 命令导入云数据库');
}

main().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import.js
git commit -m "feat(scripts): import pipeline — generates JSONL for cloud DB import"
```

---

### Task 10: Deploy and verify end-to-end

- [ ] **Step 1: Deploy getQuestions cloud function**

In WeChat DevTools: right-click `cloudfunctions/getQuestions` → "上传并部署：云端安装依赖"

- [ ] **Step 2: Deploy updated generateQuestions**

In WeChat DevTools: right-click `cloudfunctions/generateQuestions` → "上传并部署：云端安装依赖"

- [ ] **Step 3: Create DB collections and indexes**

In WeChat DevTools Cloud Console:
1. Create collection `question_bank`
   - Add index: `{ knowledgeId: 1, difficulty: 1, verified: 1 }`
   - Add index: `{ source: 1 }`
2. Create collection `user_question_log`
   - Add index: `{ openid: 1, knowledgeId: 1, servedAt: -1 }`
3. Create collection `user_knowledge_done`
   - Add index: `{ openid: 1, knowledgeId: 1 }`

- [ ] **Step 4: Test with empty bank (pure AI fallback)**

Open the mini program, select a knowledge point, generate questions. Should work identically to before (all AI-generated), since bank is empty.

- [ ] **Step 5: Manually insert a test question into question_bank**

In Cloud Console → Database → question_bank → Add record:
```json
{
  "knowledgeId": "g5u-3-2",
  "knowledgeName": "除数是小数的小数除法",
  "grade": "五年级",
  "semester": "上册",
  "unit": 3,
  "questionType": "calculation",
  "difficulty": "medium",
  "content": "7.2 ÷ 0.9 = ?",
  "answer": "8",
  "solution": "将 7.2 和 0.9 同时扩大 10 倍，得 72 ÷ 9 = 8",
  "tip": "注意小数点移动位数要一致",
  "source": "rewritten_exam",
  "verified": true,
  "createdAt": "2026-04-02T00:00:00Z",
  "updatedAt": "2026-04-02T00:00:00Z"
}
```

- [ ] **Step 6: Test with bank question**

Select 五年级上册 → 除数是小数的小数除法 → generate 1 question. Verify the returned question is the manually inserted bank question (content: "7.2 ÷ 0.9 = ?").

- [ ] **Step 7: Test dedup**

Generate again for the same knowledge point. Should return AI-generated question (bank question already served).

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: question bank system — complete P2 implementation"
```

---

### Task 11: Create `cleanExpiredLogs` scheduled cloud function

**Files:**
- Create: `cloudfunctions/cleanExpiredLogs/package.json`
- Create: `cloudfunctions/cleanExpiredLogs/index.js`

This cloud function should be set up as a weekly timer trigger in the WeChat Cloud Console.

- [ ] **Step 1: Create package.json**

Write to `cloudfunctions/cleanExpiredLogs/package.json`:

```json
{
  "name": "cleanExpiredLogs",
  "version": "1.0.0",
  "description": "定期清理过期的出题记录（30天）",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Write index.js**

Write to `cloudfunctions/cleanExpiredLogs/index.js`:

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const MAX_BATCH = 100;

exports.main = async (event, context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;
  let totalDoneUpdated = 0;

  // 1. 查询过期的 user_question_log 记录
  // 由于云数据库单次最多删除/查询 100 条，循环批量处理
  let hasMore = true;
  while (hasMore) {
    const expiredLogs = await db.collection('user_question_log')
      .where({ servedAt: _.lt(thirtyDaysAgo) })
      .limit(MAX_BATCH)
      .get();

    if (expiredLogs.data.length === 0) {
      hasMore = false;
      break;
    }

    // 按 openid + knowledgeId 分组，收集过期的 questionId
    const groupMap = {};
    const idsToDelete = [];

    for (const log of expiredLogs.data) {
      idsToDelete.push(log._id);
      if (log.questionId) {
        const key = `${log.openid}|${log.knowledgeId}`;
        if (!groupMap[key]) groupMap[key] = { openid: log.openid, knowledgeId: log.knowledgeId, ids: [] };
        groupMap[key].ids.push(log.questionId);
      }
    }

    // 2. 从 user_knowledge_done 中移除过期 ID
    for (const group of Object.values(groupMap)) {
      try {
        await db.collection('user_knowledge_done')
          .where({ openid: group.openid, knowledgeId: group.knowledgeId })
          .update({ data: { doneQuestionIds: _.pullAll(group.ids), lastUpdated: new Date() } });
        totalDoneUpdated++;
      } catch (e) {
        console.error('[clean] pullAll error:', e.message);
      }
    }

    // 3. 删除过期 log 记录
    for (const id of idsToDelete) {
      try {
        await db.collection('user_question_log').doc(id).remove();
        totalDeleted++;
      } catch (e) {
        console.error('[clean] remove error:', e.message);
      }
    }

    if (expiredLogs.data.length < MAX_BATCH) hasMore = false;
  }

  const result = { totalDeleted, totalDoneUpdated, cleanedAt: new Date().toISOString() };
  console.log('[cleanExpiredLogs] done:', JSON.stringify(result));
  return result;
};
```

- [ ] **Step 3: Deploy and configure timer trigger**

1. Deploy: In WeChat DevTools, right-click `cloudfunctions/cleanExpiredLogs` → "上传并部署：云端安装依赖"
2. In Cloud Console → 云函数 → cleanExpiredLogs → 触发器 → 新建触发器:
   - 名称: `weeklyClean`
   - 触发周期: `0 0 3 * * 1`（每周一凌晨 3 点）

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/cleanExpiredLogs/
git commit -m "feat(cleanExpiredLogs): scheduled cleanup for expired dedup data"
```
