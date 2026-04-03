# OCR 识别 + 加强训练题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real OCR recognition to the "提高" page using `qwen3-vl-flash`, enabling users to photograph math papers, select recognized questions, and generate targeted practice.

**Architecture:** Two-step flow — (1) new `ocrRecognize` cloud function handles image → AI OCR → structured question list with knowledge point matching; (2) frontend `improve` page rebuilt with image annotation + list selection UI, then calls existing `getQuestions`/`generateQuestions` for training generation.

**Tech Stack:** WeChat Mini Program (云开发), DashScope `qwen3-vl-flash` via OpenAI SDK, `wx-server-sdk`, existing `getQuestions`/`generateQuestions` cloud functions.

**Spec:** `docs/superpowers/specs/2026-04-03-ocr-improve-design.md`

---

### Task 1: Cloud Function Scaffolding — `ocrRecognize` package files

**Files:**
- Create: `cloudfunctions/ocrRecognize/package.json`
- Create: `cloudfunctions/ocrRecognize/config.json`

- [ ] **Step 1: Create `package.json`**

Create `cloudfunctions/ocrRecognize/package.json`:

```json
{
  "name": "ocrRecognize",
  "version": "1.0.0",
  "description": "OCR recognition cloud function using qwen3-vl-flash",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "openai": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `config.json`**

Create `cloudfunctions/ocrRecognize/config.json`:

```json
{
  "permissions": {
    "openapi": []
  },
  "timeout": 60
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd cloudfunctions/ocrRecognize && npm install`
Expected: `node_modules/` created with `wx-server-sdk` and `openai`

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/ocrRecognize/package.json cloudfunctions/ocrRecognize/config.json
git commit -m "feat(ocrRecognize): scaffold cloud function with package and config"
```

---

### Task 2: Knowledge Point Mapping Module

**Files:**
- Create: `cloudfunctions/ocrRecognize/knowledgeData.js` (copy from `utils/knowledgeData.js`)
- Create: `cloudfunctions/ocrRecognize/knowledgeMapping.js`

- [ ] **Step 1: Copy `knowledgeData.js` to cloud function directory**

Copy `utils/knowledgeData.js` to `cloudfunctions/ocrRecognize/knowledgeData.js` (exact copy — this file is the source of truth for knowledge IDs and names).

Run: `cp utils/knowledgeData.js cloudfunctions/ocrRecognize/knowledgeData.js`

- [ ] **Step 2: Create `knowledgeMapping.js`**

Create `cloudfunctions/ocrRecognize/knowledgeMapping.js`:

```javascript
const knowledgeData = require('./knowledgeData.js');

const VALID_KNOWLEDGE_IDS = new Set([
  'g1u-1-1', 'g1u-1-2', 'g1u-2-1', 'g1u-2-2',
  'g1u-3-1', 'g1u-3-2', 'g1u-3-3', 'g1u-3-4', 'g1u-3-5', 'g1u-3-6', 'g1u-3-7',
  'g1u-4-1', 'g1u-5-1', 'g1u-5-2', 'g1u-5-3', 'g1u-5-4', 'g1u-5-5', 'g1u-5-6', 'g1u-5-7', 'g1u-5-8',
  'g1u-6-1', 'g1u-6-2', 'g1u-7-1', 'g1u-8-1', 'g1u-8-2', 'g1u-8-3',
  'g1l-1-1', 'g1l-1-2', 'g1l-2-1', 'g1l-2-2', 'g1l-2-3', 'g1l-3-1',
  'g1l-4-1', 'g1l-4-2', 'g1l-4-3', 'g1l-4-4', 'g1l-4-5', 'g1l-4-6',
  'g1l-5-1', 'g1l-5-2', 'g1l-6-1', 'g1l-6-2', 'g1l-6-3', 'g1l-7-1', 'g1l-7-2',
  'g2u-1-1', 'g2u-1-2', 'g2u-2-1', 'g2u-2-2', 'g2u-2-3', 'g2u-2-4',
  'g2u-3-1', 'g2u-3-2', 'g2u-4-1', 'g2u-4-2', 'g2u-5-1',
  'g2u-6-1', 'g2u-6-2', 'g2u-6-3', 'g2u-7-1', 'g2u-8-1',
  'g2l-1-1', 'g2l-2-1', 'g2l-2-2', 'g2l-3-1', 'g2l-3-2',
  'g2l-4-1', 'g2l-4-2', 'g2l-5-1', 'g2l-5-2', 'g2l-6-1', 'g2l-6-2',
  'g2l-7-1', 'g2l-7-2', 'g2l-7-3', 'g2l-8-1', 'g2l-9-1',
  'g3u-1-1', 'g3u-1-2', 'g3u-2-1', 'g3u-2-2', 'g3u-3-1', 'g3u-3-2', 'g3u-3-3',
  'g3u-4-1', 'g3u-4-2', 'g3u-5-1', 'g3u-5-2', 'g3u-5-3',
  'g3u-6-1', 'g3u-6-2', 'g3u-6-3', 'g3u-7-1', 'g3u-7-2', 'g3u-7-3', 'g3u-7-4',
  'g3u-8-1', 'g3u-8-2', 'g3u-9-1',
  'g3l-1-1', 'g3l-1-2', 'g3l-2-1', 'g3l-2-2', 'g3l-2-3', 'g3l-3-1',
  'g3l-4-1', 'g3l-4-2', 'g3l-5-1', 'g3l-5-2', 'g3l-5-3',
  'g3l-6-1', 'g3l-6-2', 'g3l-7-1', 'g3l-7-2', 'g3l-7-3', 'g3l-8-1',
  'g4u-1-1', 'g4u-1-2', 'g4u-1-3', 'g4u-2-1', 'g4u-2-2',
  'g4u-3-1', 'g4u-3-2', 'g4u-3-3', 'g4u-3-4', 'g4u-4-1', 'g4u-4-2',
  'g4u-5-1', 'g4u-5-2', 'g4u-6-1', 'g4u-6-2', 'g4u-6-3',
  'g4u-7-1', 'g4u-8-1', 'g4u-8-2',
  'g4l-1-1', 'g4l-1-2', 'g4l-1-3', 'g4l-2-1',
  'g4l-3-1', 'g4l-3-2', 'g4l-3-3',
  'g4l-4-1', 'g4l-4-2', 'g4l-4-3', 'g4l-4-4', 'g4l-4-5', 'g4l-4-6', 'g4l-4-7',
  'g4l-5-1', 'g4l-5-2', 'g4l-5-3', 'g4l-6-1', 'g4l-6-2',
  'g4l-7-1', 'g4l-7-2', 'g4l-8-1', 'g4l-8-2', 'g4l-9-1',
  'g5u-1-1', 'g5u-1-2', 'g5u-1-3', 'g5u-1-4', 'g5u-2-1',
  'g5u-3-1', 'g5u-3-2', 'g5u-3-3', 'g5u-3-4', 'g5u-4-1', 'g5u-4-2',
  'g5u-5-1', 'g5u-5-2', 'g5u-5-3', 'g5u-5-4',
  'g5u-6-1', 'g5u-6-2', 'g5u-6-3', 'g5u-6-4',
  'g5u-7-1', 'g5u-7-2', 'g5u-7-3',
  'g5l-1-1', 'g5l-2-1', 'g5l-2-2', 'g5l-2-3', 'g5l-2-4', 'g5l-2-5',
  'g5l-3-1', 'g5l-3-2', 'g5l-3-3', 'g5l-3-4', 'g5l-3-5',
  'g5l-4-1', 'g5l-4-2', 'g5l-4-3', 'g5l-4-4', 'g5l-4-5', 'g5l-4-6', 'g5l-4-7',
  'g5l-5-1', 'g5l-6-1', 'g5l-6-2', 'g5l-6-3',
  'g5l-7-1', 'g5l-7-2', 'g5l-8-1',
  'g6u-1-1', 'g6u-1-2', 'g6u-1-3', 'g6u-1-4', 'g6u-2-1',
  'g6u-3-1', 'g6u-3-2', 'g6u-3-3', 'g6u-3-4',
  'g6u-4-1', 'g6u-4-2', 'g6u-4-3',
  'g6u-5-1', 'g6u-5-2', 'g6u-5-3', 'g6u-5-4',
  'g6u-6-1', 'g6u-6-2', 'g6u-6-3', 'g6u-7-1', 'g6u-8-1',
  'g6l-1-1', 'g6l-1-2', 'g6l-2-1', 'g6l-2-2', 'g6l-2-3', 'g6l-2-4',
  'g6l-3-1', 'g6l-3-2', 'g6l-3-3', 'g6l-3-4', 'g6l-3-5',
  'g6l-4-1', 'g6l-4-2', 'g6l-4-3', 'g6l-4-4', 'g6l-4-5', 'g6l-4-6', 'g6l-4-7',
  'g6l-5-1', 'g6l-6-1', 'g6l-6-2', 'g6l-6-3'
]);

function getGradeKey(grade, semester) {
  const gradeMap = {
    '一年级': 'grade1', '二年级': 'grade2', '三年级': 'grade3',
    '四年级': 'grade4', '五年级': 'grade5', '六年级': 'grade6'
  };
  const semesterMap = { upper: 'upper', lower: 'lower' };
  const g = gradeMap[grade];
  const s = semesterMap[semester];
  if (!g || !s) return null;
  return `${g}-${s}`;
}

function getKnowledgeList(grade, semester) {
  const key = getGradeKey(grade, semester);
  if (!key || !knowledgeData[key]) return [];
  const list = [];
  const data = knowledgeData[key];
  if (data.chapters) {
    data.chapters.forEach(chapter => {
      if (chapter.knowledges) {
        chapter.knowledges.forEach(k => {
          list.push({ id: k.id, name: k.name });
        });
      }
    });
  }
  return list;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.8;
  let matches = 0;
  const shorter = la.length <= lb.length ? la : lb;
  const longer = la.length > lb.length ? la : lb;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

function matchKnowledge(aiKnowledgePoint, grade, semester) {
  const list = getKnowledgeList(grade, semester);
  if (list.length === 0) return { knowledgeId: null, knowledgeName: null };

  let bestMatch = null;
  let bestScore = 0;

  for (const k of list) {
    const score = similarity(aiKnowledgePoint, k.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = k;
    }
  }

  if (bestScore >= 0.6 && bestMatch && VALID_KNOWLEDGE_IDS.has(bestMatch.id)) {
    return { knowledgeId: bestMatch.id, knowledgeName: bestMatch.name };
  }
  return { knowledgeId: null, knowledgeName: null };
}

module.exports = { matchKnowledge, getKnowledgeList, similarity };
```

- [ ] **Step 3: Verify the module loads correctly**

Run: `cd cloudfunctions/ocrRecognize && node -e "const m = require('./knowledgeMapping'); console.log(m.matchKnowledge('长方形的周长', '三年级', 'upper'));"`
Expected: `{ knowledgeId: 'g3u-5-1', knowledgeName: '长方形和正方形的周长' }` (or similar match with score >= 0.6)

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/ocrRecognize/knowledgeData.js cloudfunctions/ocrRecognize/knowledgeMapping.js
git commit -m "feat(ocrRecognize): add knowledge point mapping module"
```

---

### Task 3: Cloud Function Main Entry — `ocrRecognize/index.js`

**Files:**
- Create: `cloudfunctions/ocrRecognize/index.js`

- [ ] **Step 1: Create `index.js`**

Create `cloudfunctions/ocrRecognize/index.js`:

```javascript
const cloud = require('wx-server-sdk');
const OpenAI = require('openai');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { matchKnowledge } = require('./knowledgeMapping');

const RATE_LIMIT_MS = 15000;
const rateLimitCache = new Map();

function checkRateLimit(openid) {
  const now = Date.now();
  const last = rateLimitCache.get(openid);
  if (last && now - last < RATE_LIMIT_MS) {
    const waitTime = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    return { allowed: false, waitTime };
  }
  rateLimitCache.set(openid, now);
  if (rateLimitCache.size > 500) {
    const expireTime = now - RATE_LIMIT_MS * 2;
    for (const [key, time] of rateLimitCache) {
      if (time < expireTime) rateLimitCache.delete(key);
    }
  }
  return { allowed: true };
}

const SYSTEM_PROMPT = `你是一个小学数学试卷识别助手。请分析图片中的数学题目，返回 JSON 格式结果。

要求：
1. 识别每道独立的题目，按顺序编号
2. 提取完整题目文本，包含所有条件和问题
3. 如果题目包含图形/图表，用文字详细描述图形内容
4. 标注每道题在图片中的位置（top 和 bottom，0-1 之间的比例值）
5. 分析每道题对应的数学知识点（参考人教版小学数学）
6. 评估难度：easy（基础计算/概念）、medium（需要多步推理）、hard（综合应用/拓展）

只输出纯JSON，不加其他内容。格式：
{"questions":[{"index":1,"content":"完整题目文本","position":{"top":0.0,"bottom":0.0},"knowledgePoint":"知识点名称","difficulty":"easy|medium|hard","hasGraphic":false,"graphicDesc":null}]}`;

function buildUserPrompt(grade) {
  return `请识别这张${grade}数学试卷/作业中的所有题目。`;
}

function parseOcrResponse(content) {
  if (!content) throw new Error('API响应为空');
  console.log('[OCR原始响应]', content.slice(0, 300));

  let jsonStr = content.trim().replace(/```json?|```/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('题目列表格式错误');
  }
  return parsed.questions.map((q, i) => ({
    index: q.index || i + 1,
    content: String(q.content || '').trim(),
    position: {
      top: Math.max(0, Math.min(1, Number(q.position?.top) || 0)),
      bottom: Math.max(0, Math.min(1, Number(q.position?.bottom) || 1))
    },
    knowledgePoint: String(q.knowledgePoint || '').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    hasGraphic: !!q.hasGraphic,
    graphicDesc: q.hasGraphic ? String(q.graphicDesc || '').trim() || null : null
  }));
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const requestId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[ocrRecognize] 开始:', JSON.stringify({ requestId, fileID: event.fileID, grade: event.grade }));

  if (!openid) {
    return { success: false, error: '请先登录后再使用', code: 'UNAUTHORIZED' };
  }

  const rateResult = checkRateLimit(openid);
  if (!rateResult.allowed) {
    return {
      success: false,
      error: `操作太频繁，请等待 ${rateResult.waitTime} 秒后再试`,
      code: 'RATE_LIMITED',
      waitTime: rateResult.waitTime
    };
  }

  const { fileID, grade, semester } = event;
  if (!fileID || !grade) {
    return { success: false, error: '缺少必要参数', code: 'INVALID_PARAMS' };
  }

  const validGrades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  if (!validGrades.includes(grade)) {
    return { success: false, error: '年级参数无效', code: 'INVALID_PARAMS' };
  }

  const validSemesters = ['upper', 'lower'];
  if (semester && !validSemesters.includes(semester)) {
    return { success: false, error: '学期参数无效', code: 'INVALID_PARAMS' };
  }

  const apiKey = process.env.QWEN_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: '服务配置错误', code: 'CONFIG_ERROR' };
  }

  try {
    const fileRes = await cloud.downloadFile({ fileID });
    const buffer = fileRes.fileContent;
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    console.log('[ocrRecognize] 图片下载完成, size:', buffer.length);

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      timeout: 50000,
      maxRetries: 1
    });

    const userPrompt = buildUserPrompt(grade);

    let questions;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model: 'qwen3-vl-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: dataUrl } },
                { type: 'text', text: userPrompt }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4096
        });

        const content = completion.choices?.[0]?.message?.content;
        questions = parseOcrResponse(content);
        break;
      } catch (parseErr) {
        console.warn(`[ocrRecognize] attempt ${attempt + 1} failed:`, parseErr.message);
        if (attempt === 1) throw parseErr;
      }
    }

    if (!questions || questions.length === 0) {
      return {
        success: false,
        error: '未识别到题目，建议拍清晰一些或调整角度',
        code: 'NO_QUESTIONS'
      };
    }

    const effectiveSemester = semester || 'upper';
    const enriched = questions.map(q => {
      const match = matchKnowledge(q.knowledgePoint, grade, effectiveSemester);
      return { ...q, knowledgeId: match.knowledgeId, knowledgeName: match.knowledgeName };
    });

    console.log('[ocrRecognize] 完成:', JSON.stringify({
      requestId, questionCount: enriched.length,
      matchedCount: enriched.filter(q => q.knowledgeId).length
    }));

    return { success: true, questions: enriched };

  } catch (error) {
    console.error('[ocrRecognize] 失败:', JSON.stringify({
      requestId, message: error.message, status: error.status || null
    }));

    let userMessage = '识别失败，请重新拍照';
    if (error.status === 429) userMessage = '请求过于频繁，请稍后再试';
    else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') userMessage = '网络超时，请重试';

    return { success: false, error: userMessage, code: 'OCR_ERROR' };
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/ocrRecognize/index.js
git commit -m "feat(ocrRecognize): implement OCR cloud function with qwen3-vl-flash"
```

---

### Task 4: Frontend — Improve Page JavaScript (Full Rewrite)

**Files:**
- Modify: `pages/improve/improve.js`

- [ ] **Step 1: Rewrite `improve.js`**

Replace the entire contents of `pages/improve/improve.js` with:

```javascript
const app = getApp();

const DIFFICULTY_COUNT = { easy: 2, medium: 3, hard: 5 };

const GRADE_LIST = [
  { label: '1年级', value: 'grade1' },
  { label: '2年级', value: 'grade2' },
  { label: '3年级', value: 'grade3' },
  { label: '4年级', value: 'grade4' },
  { label: '5年级', value: 'grade5' },
  { label: '6年级', value: 'grade6' }
];

const GRADE_LABEL_MAP = {
  grade1: '一年级', grade2: '二年级', grade3: '三年级',
  grade4: '四年级', grade5: '五年级', grade6: '六年级'
};

Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    pageState: 'idle',
    imagePath: '',
    uploadProgress: 0,
    questions: [],
    selectedMap: {},
    selectedCount: 0,
    expandedIndex: -1,
    totalTrainingCount: 0,
    selectedGrade: 'grade5',
    selectedSemester: 'upper',
    gradeList: GRADE_LIST
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
  },

  handleGradeChange(e) {
    const grade = e.currentTarget.dataset.grade;
    if (grade === this.data.selectedGrade) return;
    this.setData({ selectedGrade: grade });
  },

  handleSemesterChange(e) {
    const semester = e.currentTarget.dataset.semester;
    if (semester === this.data.selectedSemester) return;
    this.setData({ selectedSemester: semester });
  },

  _gradeLabel() {
    return GRADE_LABEL_MAP[this.data.selectedGrade] || '五年级';
  },

  chooseImage() {
    const self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        self.setData({
          imagePath: tempFilePath,
          pageState: 'idle',
          questions: [],
          selectedMap: {},
          selectedCount: 0,
          expandedIndex: -1,
          totalTrainingCount: 0
        });
        self.uploadAndAnalyze(tempFilePath);
      }
    });
  },

  async uploadAndAnalyze(filePath) {
    this.setData({ pageState: 'uploading', uploadProgress: 0 });

    try {
      const timestamp = Date.now();
      const cloudPath = `ocr/${timestamp}_${Math.random().toString(36).slice(2, 8)}.jpg`;

      const uploadRes = await new Promise((resolve, reject) => {
        const task = wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: resolve,
          fail: reject
        });
        task.onProgressUpdate(res => {
          this.setData({ uploadProgress: res.progress });
        });
      });

      this.setData({ pageState: 'analyzing' });

      const ocrRes = await wx.cloud.callFunction({
        name: 'ocrRecognize',
        data: {
          fileID: uploadRes.fileID,
          grade: this._gradeLabel(),
          semester: this.data.selectedSemester
        }
      });

      const result = ocrRes.result;

      if (result.code === 'RATE_LIMITED') {
        wx.showToast({ title: `操作太频繁，请${result.waitTime}秒后再试`, icon: 'none' });
        this.setData({ pageState: 'idle' });
        return;
      }

      if (!result.success || !result.questions || result.questions.length === 0) {
        wx.showToast({
          title: result.error || '未识别到题目，建议拍清晰一些',
          icon: 'none',
          duration: 3000
        });
        this.setData({ pageState: 'idle' });
        return;
      }

      this.setData({
        pageState: 'result',
        questions: result.questions
      });

    } catch (err) {
      console.error('[improve] uploadAndAnalyze error:', err);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
      this.setData({ pageState: 'idle' });
    }
  },

  toggleQuestion(e) {
    const idx = e.currentTarget.dataset.index;
    const key = `selectedMap.${idx}`;
    const current = this.data.selectedMap[idx] || false;
    const newVal = !current;
    this.setData({ [key]: newVal });
    this.updateSelectedCount();
  },

  toggleFromImage(e) {
    const idx = e.currentTarget.dataset.index;
    const key = `selectedMap.${idx}`;
    const current = this.data.selectedMap[idx] || false;
    this.setData({ [key]: !current });
    this.updateSelectedCount();
  },

  expandQuestion(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({
      expandedIndex: this.data.expandedIndex === idx ? -1 : idx
    });
  },

  updateSelectedCount() {
    const map = this.data.selectedMap;
    const questions = this.data.questions;
    let count = 0;
    let trainingCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (map[i]) {
        count++;
        trainingCount += DIFFICULTY_COUNT[questions[i].difficulty] || 3;
      }
    }
    this.setData({ selectedCount: count, totalTrainingCount: trainingCount });
  },

  async startTraining() {
    const { questions, selectedMap } = this.data;
    const chosen = [];
    for (let i = 0; i < questions.length; i++) {
      if (selectedMap[i]) chosen.push(questions[i]);
    }

    if (chosen.length === 0) {
      wx.showToast({ title: '请先选择题目', icon: 'none' });
      return;
    }

    this.setData({ pageState: 'generating' });

    const groups = {};
    chosen.forEach(q => {
      const groupKey = q.knowledgeId || `unmatched_${q.knowledgePoint}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          knowledgeId: q.knowledgeId,
          knowledgeName: q.knowledgeName,
          knowledgePoint: q.knowledgePoint,
          totalCount: 0,
          contents: []
        };
      }
      groups[groupKey].totalCount += DIFFICULTY_COUNT[q.difficulty] || 3;
      groups[groupKey].contents.push(q.content);
    });

    const gradeLabel = this._gradeLabel();
    const questionMode = wx.getStorageSync('questionMode') || 'bank';
    const calls = [];

    Object.values(groups).forEach(group => {
      const batches = [];
      let remaining = group.totalCount;
      while (remaining > 0) {
        batches.push(Math.min(remaining, 10));
        remaining -= 10;
      }

      batches.forEach(batchCount => {
        if (group.knowledgeId) {
          const fnName = questionMode === 'auto' ? 'generateQuestions' : 'getQuestions';
          calls.push(
            wx.cloud.callFunction({
              name: fnName,
              data: {
                knowledgeId: group.knowledgeId,
                knowledgeName: group.knowledgeName,
                grade: gradeLabel,
                count: batchCount,
                difficulty: 'medium',
                questionType: 'calculation',
                existingQuestions: []
              }
            }).then(res => res.result).catch(err => {
              console.error('[improve] getQuestions error:', err);
              return { success: false, error: err.message };
            })
          );
        } else {
          const hint = (group.contents[0] || '').slice(0, 80);
          calls.push(
            wx.cloud.callFunction({
              name: 'generateQuestions',
              data: {
                knowledgeName: (group.knowledgePoint || '数学题').slice(0, 50),
                grade: gradeLabel,
                count: batchCount,
                difficulty: 'medium',
                questionType: 'calculation',
                existingQuestions: [],
                prefetchHint: hint
              }
            }).then(res => res.result).catch(err => {
              console.error('[improve] generateQuestions error:', err);
              return { success: false, error: err.message };
            })
          );
        }
      });
    });

    try {
      const results = await Promise.all(calls);
      const allQuestions = [];
      let failCount = 0;

      results.forEach(r => {
        if (r && r.success && r.questions) {
          allQuestions.push(...r.questions);
        } else {
          failCount++;
        }
      });

      if (allQuestions.length === 0) {
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        this.setData({ pageState: 'result' });
        return;
      }

      if (failCount > 0) {
        wx.showToast({ title: `${failCount}组题目生成失败，已跳过`, icon: 'none' });
      }

      app.globalData.currentQuestions = {
        questions: allQuestions,
        knowledge: { id: 'mixed', name: 'OCR加强训练' },
        meta: { questionType: 'calculation', origin: 'ocr_improve' }
      };

      wx.navigateTo({ url: '/pages/practice/practice?source=generated' });
      this.setData({ pageState: 'result' });

    } catch (err) {
      console.error('[improve] startTraining error:', err);
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
      this.setData({ pageState: 'result' });
    }
  },

  retakePhoto() {
    this.setData({
      pageState: 'idle',
      imagePath: '',
      questions: [],
      selectedMap: {},
      selectedCount: 0,
      expandedIndex: -1,
      totalTrainingCount: 0
    });
    this.chooseImage();
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add pages/improve/improve.js
git commit -m "feat(improve): rewrite JS with real OCR flow and training generation"
```

---

### Task 5: Frontend — Improve Page Template (Full Rewrite)

**Files:**
- Modify: `pages/improve/improve.wxml`

- [ ] **Step 1: Rewrite `improve.wxml`**

Replace the entire contents of `pages/improve/improve.wxml` with:

```xml
<view class="improve-page">

  <!-- 自定义导航栏 -->
  <view class="nav-bar" style="padding-top: {{statusBarHeight}}px;">
    <view class="nav-content">
      <view class="nav-logo">
        <image class="nav-duck" src="/images/duck-avatar.png" mode="aspectFit"></image>
        <text class="nav-title">出题鸭</text>
      </view>
      <view class="capsule-placeholder"></view>
    </view>
  </view>

  <!-- idle 状态：引导 + 拍照 -->
  <block wx:if="{{pageState === 'idle'}}">
    <view class="guide-section">
      <view class="guide-icon-wrap">
        <image class="guide-icon" src="/images/tab-improve-active.png" mode="aspectFit"></image>
      </view>
      <text class="guide-title">拍照分析错题</text>
      <text class="guide-desc">拍照或选择试卷图片，AI 识别每道题目，生成针对性加强训练</text>
    </view>

    <!-- 年级学期选择 -->
    <view class="grade-semester-section">
      <view class="grade-scroll">
        <view
          wx:for="{{gradeList}}"
          wx:key="value"
          class="grade-chip {{selectedGrade === item.value ? 'chip-active' : ''}}"
          bindtap="handleGradeChange"
          data-grade="{{item.value}}">
          {{item.label}}
        </view>
      </view>
      <view class="semester-row">
        <view class="semester-chip {{selectedSemester === 'upper' ? 'chip-active' : ''}}" bindtap="handleSemesterChange" data-semester="upper">上册</view>
        <view class="semester-chip {{selectedSemester === 'lower' ? 'chip-active' : ''}}" bindtap="handleSemesterChange" data-semester="lower">下册</view>
      </view>
    </view>

    <view class="upload-section">
      <view class="upload-area" bindtap="chooseImage">
        <view class="upload-icon">+</view>
        <text class="upload-text">拍照 / 选择图片</text>
      </view>
    </view>

    <view class="tips-section">
      <view class="tip-card">
        <text class="tip-icon">1</text>
        <text class="tip-text">拍下孩子的错题或试卷</text>
      </view>
      <view class="tip-card">
        <text class="tip-icon">2</text>
        <text class="tip-text">AI 识别每道题并标注位置</text>
      </view>
      <view class="tip-card">
        <text class="tip-icon">3</text>
        <text class="tip-text">选择题目，生成同类加强训练</text>
      </view>
    </view>
  </block>

  <!-- uploading 状态 -->
  <block wx:if="{{pageState === 'uploading'}}">
    <view class="loading-section">
      <view class="progress-bar-wrap">
        <view class="progress-bar" style="width: {{uploadProgress}}%;"></view>
      </view>
      <text class="loading-text">正在上传图片... {{uploadProgress}}%</text>
    </view>
  </block>

  <!-- analyzing 状态 -->
  <block wx:if="{{pageState === 'analyzing'}}">
    <view class="loading-section">
      <view class="analyzing-spinner"></view>
      <text class="loading-text">AI 正在识别题目...</text>
      <text class="loading-sub">这可能需要几秒钟</text>
    </view>
  </block>

  <!-- result 状态 -->
  <block wx:if="{{pageState === 'result'}}">
    <!-- 图片标注区 -->
    <view class="annotation-section">
      <view class="annotation-wrap">
        <image class="annotation-img" src="{{imagePath}}" mode="widthFix"></image>
        <view
          wx:for="{{questions}}"
          wx:key="index"
          class="annotation-overlay {{selectedMap[index] ? 'overlay-selected' : 'overlay-default'}}"
          style="top: {{item.position.top * 100}}%; height: {{(item.position.bottom - item.position.top) * 100}}%;"
          bindtap="toggleFromImage"
          data-index="{{index}}">
          <text class="overlay-label">{{item.index}}</text>
        </view>
      </view>
    </view>

    <!-- 题目列表区 -->
    <view class="question-list-section">
      <view class="list-header">
        <text class="list-title">识别到 {{questions.length}} 道题目</text>
        <text class="list-hint">点击选择需要加强训练的题目</text>
      </view>

      <view class="question-list">
        <view
          wx:for="{{questions}}"
          wx:key="index"
          class="question-card {{selectedMap[index] ? 'card-selected' : ''}}">

          <view class="card-main" bindtap="toggleQuestion" data-index="{{index}}">
            <view class="card-checkbox {{selectedMap[index] ? 'checkbox-checked' : ''}}">
              <text wx:if="{{selectedMap[index]}}">✓</text>
            </view>

            <view class="card-body">
              <view class="card-top-row">
                <text class="card-number">第{{item.index}}题</text>
                <view class="card-tags">
                  <text class="tag-difficulty tag-{{item.difficulty}}">
                    {{item.difficulty === 'easy' ? '简单' : item.difficulty === 'medium' ? '中等' : '困难'}}
                  </text>
                  <text wx:if="{{item.hasGraphic}}" class="tag-graphic">含图</text>
                </view>
              </view>

              <text class="card-content">{{item.content}}</text>

              <view class="card-knowledge-row">
                <text class="tag-knowledge">{{item.knowledgeName || item.knowledgePoint}}</text>
                <text wx:if="{{!item.knowledgeId}}" class="tag-unmatched">未匹配</text>
              </view>
            </view>

            <view class="card-expand" catchtap="expandQuestion" data-index="{{index}}">
              <text class="expand-icon">{{expandedIndex === index ? '▲' : '▼'}}</text>
            </view>
          </view>

          <view wx:if="{{expandedIndex === index}}" class="card-detail">
            <text class="detail-label">完整题目：</text>
            <text class="detail-content">{{item.content}}</text>
            <block wx:if="{{item.hasGraphic && item.graphicDesc}}">
              <text class="detail-label">图形描述：</text>
              <text class="detail-content">{{item.graphicDesc}}</text>
            </block>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部固定栏 -->
    <view class="bottom-bar">
      <view class="bottom-left">
        <text class="bottom-count">已选 {{selectedCount}} 题</text>
        <text class="bottom-training" wx:if="{{totalTrainingCount > 0}}">将生成 {{totalTrainingCount}} 道训练题</text>
      </view>
      <view class="bottom-actions">
        <text class="btn-retake" bindtap="retakePhoto">重新拍照</text>
        <view
          class="btn-start {{selectedCount > 0 ? '' : 'btn-disabled'}}"
          bindtap="startTraining">
          开始加强训练
        </view>
      </view>
    </view>
  </block>

  <!-- generating 状态 -->
  <block wx:if="{{pageState === 'generating'}}">
    <view class="loading-section">
      <view class="analyzing-spinner"></view>
      <text class="loading-text">正在生成 {{totalTrainingCount}} 道加强训练题...</text>
      <text class="loading-sub">AI 正在根据题目分析出题</text>
    </view>
  </block>

</view>
```

- [ ] **Step 2: Commit**

```bash
git add pages/improve/improve.wxml
git commit -m "feat(improve): rewrite WXML with image annotation and question list UI"
```

---

### Task 6: Frontend — Improve Page Styles (Extend)

**Files:**
- Modify: `pages/improve/improve.wxss`

- [ ] **Step 1: Rewrite `improve.wxss`**

Replace the entire contents of `pages/improve/improve.wxss` with:

```css
.improve-page {
  min-height: 100vh;
  background: #FFFEF5;
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
}

/* ==================== 导航栏 ==================== */
.nav-bar {
  background-color: #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-content {
  height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nav-duck {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: #FFF9E6;
  border: 3rpx solid #FFB800;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2D2D2D;
  letter-spacing: 2rpx;
}
.capsule-placeholder {
  width: 174rpx;
  height: 64rpx;
  border-radius: 32rpx;
  border: 2rpx solid #EDEDEE;
  opacity: 0;
}

/* ==================== 引导区 ==================== */
.guide-section {
  text-align: center;
  padding: 40rpx 30rpx 30rpx;
}
.guide-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  margin: 0 auto 20rpx;
}
.guide-icon {
  width: 100%;
  height: 100%;
}
.guide-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 12rpx;
}
.guide-desc {
  display: block;
  font-size: 26rpx;
  color: #888;
  line-height: 1.6;
  padding: 0 40rpx;
}

/* ==================== 年级学期选择 ==================== */
.grade-semester-section {
  margin: 0 30rpx 20rpx;
}
.grade-scroll {
  display: flex;
  gap: 12rpx;
  overflow-x: auto;
  padding-bottom: 16rpx;
  -webkit-overflow-scrolling: touch;
}
.grade-chip {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  background: #fff;
  border: 3rpx solid #E8E0D0;
  color: #666;
}
.chip-active {
  background: #FFB300;
  border-color: #FFB300;
  color: #fff;
  font-weight: 600;
}
.semester-row {
  display: flex;
  gap: 12rpx;
  margin-top: 4rpx;
}
.semester-chip {
  padding: 10rpx 24rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  background: #fff;
  border: 3rpx solid #E8E0D0;
  color: #666;
}

/* ==================== 上传区 ==================== */
.upload-section {
  margin: 0 30rpx 30rpx;
}
.upload-area {
  border: 4rpx dashed #D0C8B8;
  border-radius: 24rpx;
  padding: 80rpx 0;
  text-align: center;
  background: #FFFCF5;
}
.upload-icon {
  font-size: 80rpx;
  color: #FFB300;
  line-height: 1;
  margin-bottom: 12rpx;
}
.upload-text {
  display: block;
  font-size: 28rpx;
  color: #999;
}

/* ==================== 提示步骤 ==================== */
.tips-section {
  margin: 20rpx 30rpx 0;
}
.tip-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  border: 3rpx solid #E8E0D0;
}
.tip-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #FFB300;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.tip-text {
  font-size: 28rpx;
  color: #555;
}

/* ==================== 加载状态 ==================== */
.loading-section {
  text-align: center;
  padding: 120rpx 40rpx;
}
.progress-bar-wrap {
  width: 80%;
  height: 12rpx;
  background: #F0ECE0;
  border-radius: 6rpx;
  margin: 0 auto 24rpx;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: #FFB300;
  border-radius: 6rpx;
  transition: width 0.3s;
}
.analyzing-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid #F0ECE0;
  border-top-color: #FFB300;
  border-radius: 50%;
  margin: 0 auto 24rpx;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  display: block;
  font-size: 30rpx;
  color: #555;
  margin-bottom: 8rpx;
}
.loading-sub {
  display: block;
  font-size: 24rpx;
  color: #999;
}

/* ==================== 图片标注区 ==================== */
.annotation-section {
  margin: 20rpx 30rpx;
}
.annotation-wrap {
  position: relative;
  border-radius: 20rpx;
  overflow: hidden;
  background: #fff;
  border: 3rpx solid #E8E0D0;
}
.annotation-img {
  width: 100%;
  display: block;
}
.annotation-overlay {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 8rpx 12rpx;
  transition: background 0.3s;
}
.overlay-default {
  background: rgba(200, 200, 200, 0.25);
  border-bottom: 2rpx dashed rgba(150, 150, 150, 0.4);
}
.overlay-selected {
  background: rgba(255, 179, 0, 0.25);
  border-bottom: 2rpx solid rgba(255, 179, 0, 0.6);
}
.overlay-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40rpx;
  height: 40rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
  padding: 0 12rpx;
}
.overlay-default .overlay-label {
  background: rgba(100, 100, 100, 0.6);
}
.overlay-selected .overlay-label {
  background: #FFB300;
}

/* ==================== 题目列表 ==================== */
.question-list-section {
  margin: 20rpx 30rpx 0;
}
.list-header {
  margin-bottom: 20rpx;
}
.list-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 4rpx;
}
.list-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
}
.question-list {
  padding-bottom: 200rpx;
}
.question-card {
  background: #fff;
  border: 3rpx solid #E8E0D0;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
  transition: border-color 0.3s;
}
.card-selected {
  border-color: #FFB300;
  background: #FFFCF0;
}
.card-main {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
}
.card-checkbox {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid #D0C8B8;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  margin-top: 4rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #fff;
}
.checkbox-checked {
  background: #FFB300;
  border-color: #FFB300;
}
.card-body {
  flex: 1;
  min-width: 0;
}
.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.card-number {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.card-tags {
  display: flex;
  gap: 8rpx;
}
.tag-difficulty {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}
.tag-easy {
  background: #E8F5E9;
  color: #2E7D32;
}
.tag-medium {
  background: #FFF3E0;
  color: #E65100;
}
.tag-hard {
  background: #FFEBEE;
  color: #C62828;
}
.tag-graphic {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #E3F2FD;
  color: #1565C0;
}
.card-content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
  margin-bottom: 8rpx;
}
.card-knowledge-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.tag-knowledge {
  font-size: 22rpx;
  color: #FFB300;
  background: #FFF8E1;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.tag-unmatched {
  font-size: 20rpx;
  color: #999;
  background: #F5F5F5;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}
.card-expand {
  padding: 8rpx 12rpx;
  margin-top: 4rpx;
}
.expand-icon {
  font-size: 22rpx;
  color: #999;
}
.card-detail {
  padding: 0 24rpx 24rpx;
  border-top: 2rpx solid #F0ECE0;
}
.detail-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
  margin-bottom: 4rpx;
}
.detail-content {
  display: block;
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

/* ==================== 底部固定栏 ==================== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 2rpx solid #E8E0D0;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 99;
}
.bottom-left {
  display: flex;
  flex-direction: column;
}
.bottom-count {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.bottom-training {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.bottom-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.btn-retake {
  font-size: 26rpx;
  color: #999;
  padding: 16rpx 0;
}
.btn-start {
  background: #FFB300;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  padding: 16rpx 36rpx;
  border-radius: 16rpx;
}
.btn-disabled {
  opacity: 0.4;
}
```

- [ ] **Step 2: Commit**

```bash
git add pages/improve/improve.wxss
git commit -m "feat(improve): rewrite WXSS with annotation and question list styles"
```

---

### Task 7: Integration Verification

**Files:** (no new files — verification only)

- [ ] **Step 1: Verify cloud function file structure**

Run: `ls -la cloudfunctions/ocrRecognize/`
Expected: `index.js`, `config.json`, `package.json`, `knowledgeMapping.js`, `knowledgeData.js`, `node_modules/`

- [ ] **Step 2: Verify knowledge mapping module**

Run: `cd cloudfunctions/ocrRecognize && node -e "const m = require('./knowledgeMapping'); console.log(JSON.stringify(m.matchKnowledge('小数除法', '五年级', 'upper'))); console.log(JSON.stringify(m.matchKnowledge('完全不存在的知识点', '三年级', 'upper')));"`
Expected:
- First call: matches a knowledge ID like `g5u-3-1` or similar
- Second call: `{"knowledgeId":null,"knowledgeName":null}`

- [ ] **Step 3: Verify improve page files are consistent**

Run: `wc -l pages/improve/improve.js pages/improve/improve.wxml pages/improve/improve.wxss`
Expected: All three files exist with reasonable line counts (JS ~200+, WXML ~140+, WXSS ~300+)

- [ ] **Step 4: Verify no syntax errors in JS**

Run: `node -c pages/improve/improve.js && node -c cloudfunctions/ocrRecognize/index.js && node -c cloudfunctions/ocrRecognize/knowledgeMapping.js`
Expected: All pass with no syntax errors

- [ ] **Step 5: Final commit with all files**

If any files were missed in previous commits:
```bash
git add -A
git status
git commit -m "feat: complete OCR improve feature implementation"
```

If `git status` shows clean, skip this step.

---

### Task 8: Extend `cleanExpiredLogs` for OCR Image Cleanup

**Files:**
- Modify: `cloudfunctions/cleanExpiredLogs/index.js`

- [ ] **Step 1: Add OCR image cleanup to `cleanExpiredLogs`**

Add the following OCR cleanup logic after the existing log cleanup loop (before the final `return result`):

```javascript
  // Clean up OCR images older than 7 days
  let ocrDeleted = 0;
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const listRes = await cloud.getTempFileURL({ fileList: [] });

    const { fileList } = await cloud.downloadFile({ fileID: '' }).catch(() => ({ fileList: [] }));
    // Note: Cloud storage listing requires admin SDK or manual tracking.
    // For now, use a collection to track OCR uploads.
    const ocrFiles = await db.collection('ocr_uploads')
      .where({ uploadedAt: _.lt(new Date(sevenDaysAgo)) })
      .limit(MAX_BATCH)
      .get();

    for (const file of ocrFiles.data) {
      try {
        await cloud.deleteFile({ fileList: [file.fileID] });
        await db.collection('ocr_uploads').doc(file._id).remove();
        ocrDeleted++;
      } catch (e) {
        console.error('[clean] OCR file delete error:', e.message);
      }
    }
  } catch (e) {
    console.error('[clean] OCR cleanup error:', e.message);
  }
```

**Important**: This requires the `ocrRecognize` cloud function to also record uploads in an `ocr_uploads` collection. Add this to `ocrRecognize/index.js` after the upload succeeds:

In `ocrRecognize/index.js`, after the `uploadFile` succeeds and before calling the AI, add:

```javascript
    // Track OCR upload for cleanup
    try {
      const db = cloud.database();
      await db.collection('ocr_uploads').add({
        data: { fileID: uploadRes.fileID, openid, uploadedAt: new Date() }
      });
    } catch (trackErr) {
      console.warn('[ocrRecognize] Failed to track upload:', trackErr.message);
    }
```

Wait — the `ocrRecognize` function receives `fileID` (already uploaded by the client), it doesn't do the upload itself. So tracking must happen in the cloud function after receiving the `fileID`:

In `ocrRecognize/index.js`, add after the parameter validation block and before the `try` block for downloading:

```javascript
  // Track upload for cleanup
  try {
    const db = cloud.database();
    await db.collection('ocr_uploads').add({
      data: { fileID, openid, uploadedAt: new Date() }
    });
  } catch (trackErr) {
    console.warn('[ocrRecognize] track upload error:', trackErr.message);
  }
```

Update the `cleanExpiredLogs` return to include `ocrDeleted`:

```javascript
  const result = { totalDeleted, totalDoneUpdated, ocrDeleted, cleanedAt: new Date().toISOString() };
```

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/cleanExpiredLogs/index.js cloudfunctions/ocrRecognize/index.js
git commit -m "feat(cleanExpiredLogs): extend to clean expired OCR images"
```
