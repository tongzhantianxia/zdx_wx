/**
 * 题库初始化脚本
 * 使用 AI 批量生成每个知识点的练习题，输出 NDJSON 文件用于导入云数据库
 *
 * 用法：
 *   cd scripts
 *   npm install
 *   QWEN_API_KEY=你的key node seed.js
 *
 * 可选参数（环境变量）：
 *   QWEN_API_KEY     — 必填，通义千问 API Key
 *   QWEN_MODEL       — 模型名，默认 qwen-turbo
 *   START_FROM       — 从第 N 个知识点开始（用于断点续跑），默认 0
 *   GRADE            — 只生成指定年级，如 "一年级"、"三年级"（不填则全部年级）
 *   CONCURRENCY      — 并发处理的知识点数量，默认 3
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const knowledgeDataPath = path.join(__dirname, '..', 'utils', 'knowledgeData.js');
const { getAllKnowledges } = require(knowledgeDataPath);

const API_KEY = process.env.QWEN_API_KEY || '';
const MODEL = process.env.QWEN_MODEL || 'qwen-turbo';
const START_FROM = parseInt(process.env.START_FROM, 10) || 0;
const GRADE_FILTER = process.env.GRADE || '';
const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 3;

const PROGRESS_FILE = path.join(__dirname, 'seed_progress.json');
const OUTPUT_FILE = path.join(__dirname, 'seed_import.json');

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  return {};
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function extractGrade(semester) {
  const m = semester.match(/^(.*年级)/);
  return m ? m[1] : '';
}

function extractSemesterPart(semester) {
  return semester.includes('上册') ? '上册' : '下册';
}

const QUESTION_TYPES = ['calculation', 'fillBlank', 'application'];
const TYPE_CN = { calculation: '计算题', fillBlank: '填空题', application: '应用题' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFF_CN = { easy: '简单', medium: '中等', hard: '困难' };

const COUNT_PER_CALL = 50;

// 各题型/难度分配：50题 = 计算18 + 填空18 + 应用14，简单/中等/困难各约1/3
const TYPE_DIST = [
  { questionType: 'calculation', difficulty: 'easy',   count: 6 },
  { questionType: 'calculation', difficulty: 'medium', count: 6 },
  { questionType: 'calculation', difficulty: 'hard',   count: 6 },
  { questionType: 'fillBlank',   difficulty: 'easy',   count: 6 },
  { questionType: 'fillBlank',   difficulty: 'medium', count: 6 },
  { questionType: 'fillBlank',   difficulty: 'hard',   count: 6 },
  { questionType: 'application', difficulty: 'easy',   count: 5 },
  { questionType: 'application', difficulty: 'medium', count: 5 },
  { questionType: 'application', difficulty: 'hard',   count: 4 },
];

function buildPrompt(knowledge) {
  const grade = extractGrade(knowledge.semester);
  const distDesc = TYPE_DIST.map(d =>
    `${TYPE_CN[d.questionType]}/${DIFF_CN[d.difficulty]} ${d.count}题`
  ).join('、');

  return `你是资深小学数学出题老师，请严格按照以下要求一次性生成50道题目。

年级：${grade}
知识点：${knowledge.name}
题目分布：${distDesc}

要求：
1. 题目必须紧扣「${knowledge.name}」这个知识点
2. 答案必须正确，计算题优先整除
3. 每道题的情境、数值必须不同，不能雷同
4. 小数最多两位
5. 应用题要有完整的生活场景
6. questionType 字段只能填 calculation / fillBlank / application
7. difficulty 字段只能填 easy / medium / hard

直接输出纯JSON，格式：
{"questions":[{"content":"题目","answer":"答案","solution":"解题步骤","tip":"易错提示","questionType":"calculation","difficulty":"easy"}]}`;
}

function parseQuestions(text) {
  const cleaned = text.trim().replace(/```json?|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON');
  const parsed = JSON.parse(match[0]);
  if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error('格式错误');
  return parsed.questions;
}

async function generate50(knowledge) {
  const prompt = buildPrompt(knowledge);

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是小学数学出题专家。只输出纯JSON，不加任何其他内容。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 12000,
    enable_thinking: false
  });

  const content = completion.choices?.[0]?.message?.content || '';
  return parseQuestions(content);
}

// 简单并发限制器
function createPool(concurrency) {
  let running = 0;
  const queue = [];

  function next() {
    if (running >= concurrency || queue.length === 0) return;
    running++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      running--;
      next();
    });
  }

  return function run(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

// 处理单个知识点：一次 API 调用生成 50 题
async function processKnowledge(k, idx, total, progress, counters) {
  const grade = extractGrade(k.semester);
  const semesterPart = extractSemesterPart(k.semester);

  if (progress[k.id]?.done) {
    console.log(`[${idx}/${total}] skip ${k.id} — 已完成`);
    return;
  }

  console.log(`[${idx}/${total}] ${k.id} — ${grade}${semesterPart} — ${k.name}`);

  try {
    const questions = await generate50(k);
    const now = new Date().toISOString();
    let saved = 0;

    for (const q of questions) {
      if (!q.content || !q.answer) continue;

      const record = {
        knowledgeId: k.id,
        knowledgeName: k.name,
        grade: grade,
        semester: semesterPart,
        unit: k.unit,
        questionType: q.questionType || 'fillBlank',
        difficulty: q.difficulty || 'medium',
        content: String(q.content).trim(),
        answer: String(q.answer).trim(),
        solution: String(q.solution || '').trim(),
        tip: String(q.tip || '').trim(),
        source: 'ai_generated',
        verified: true,
        createdAt: now,
        updatedAt: now
      };

      fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n');
      saved++;
      counters.generated++;
    }

    console.log(`  [${k.id}] ✓ ${saved}/${COUNT_PER_CALL} 题已保存`);
    progress[k.id] = { done: true, generated: saved, lastUpdate: now };

  } catch (e) {
    counters.failed++;
    console.log(`  [${k.id}] ✗ 失败: ${e.message}`);
    progress[k.id] = { done: false, lastUpdate: new Date().toISOString() };
  }

  saveProgress(progress);
}

async function main() {
  if (!API_KEY) {
    console.error('请设置环境变量 QWEN_API_KEY');
    console.error('用法: QWEN_API_KEY=sk-xxx node seed.js');
    process.exit(1);
  }

  let allKnowledges = getAllKnowledges();

  if (GRADE_FILTER) {
    allKnowledges = allKnowledges.filter(k => extractGrade(k.semester) === GRADE_FILTER);
    if (allKnowledges.length === 0) {
      console.error(`未找到年级 "${GRADE_FILTER}" 的知识点，可用年级：一年级 二年级 三年级 四年级 五年级 六年级`);
      process.exit(1);
    }
  }

  const knowledges = allKnowledges.slice(START_FROM);
  const progress = loadProgress();
  const existingLines = fs.existsSync(OUTPUT_FILE)
    ? fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean).length
    : 0;

  console.log(`\n========== 题库初始化 ==========`);
  console.log(`模型: ${MODEL}`);
  console.log(`年级过滤: ${GRADE_FILTER || '全部'}`);
  console.log(`知识点总数: ${knowledges.length}`);
  console.log(`每知识点: ${COUNT_PER_CALL} 题（单次调用）`);
  console.log(`并发数: ${CONCURRENCY}`);
  console.log(`从第 ${START_FROM} 个开始`);
  console.log(`已有记录: ${existingLines} 条`);
  console.log(`================================\n`);

  const counters = { generated: 0, failed: 0 };
  const pool = createPool(CONCURRENCY);
  const total = knowledges.length;

  await Promise.all(
    knowledges.map((k, i) =>
      pool(() => processKnowledge(k, START_FROM + i, total, progress, counters))
    )
  );

  const finalCount = fs.existsSync(OUTPUT_FILE)
    ? fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean).length
    : 0;

  console.log(`\n========== 完成 ==========`);
  console.log(`本次生成: ${counters.generated} 题`);
  console.log(`失败批次: ${counters.failed}`);
  console.log(`文件总计: ${finalCount} 条`);
  console.log(`输出文件: ${OUTPUT_FILE}`);
  console.log(`\n下一步: 在微信云开发控制台导入 seed_import.json`);
  console.log(`或使用 tcb CLI: tcb database import -e 你的环境ID --collection question_bank --file ${OUTPUT_FILE}`);
  console.log(`===========================`);
}

main().catch(console.error);
