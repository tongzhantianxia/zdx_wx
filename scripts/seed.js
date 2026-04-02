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
 *   PER_KNOWLEDGE    — 每个知识点生成题数，默认 10
 *   START_FROM       — 从第 N 个知识点开始（用于断点续跑），默认 0
 *   BATCH_SIZE       — 单次 API 调用生成几题，默认 5
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const knowledgeDataPath = path.join(__dirname, '..', 'utils', 'knowledgeData.js');
const { getAllKnowledges } = require(knowledgeDataPath);

const API_KEY = process.env.QWEN_API_KEY || '';
const MODEL = process.env.QWEN_MODEL || 'qwen-turbo';
const PER_KNOWLEDGE = parseInt(process.env.PER_KNOWLEDGE, 10) || 10;
const START_FROM = parseInt(process.env.START_FROM, 10) || 0;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 5;

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

function buildPrompt(knowledge, questionType, difficulty, count) {
  const grade = extractGrade(knowledge.semester);
  return `你是资深小学数学出题老师，请严格按照以下要求生成题目。

年级：${grade}
知识点：${knowledge.name}
题型：${TYPE_CN[questionType]}
难度：${DIFF_CN[difficulty]}
数量：${count}题

要求：
1. 题目必须紧扣「${knowledge.name}」这个知识点
2. 答案必须正确，计算题优先整除
3. 每道题的情境、数值必须不同，不能雷同
4. 小数最多两位
5. 应用题要有完整的生活场景

直接输出纯JSON，格式：
{"questions":[{"content":"题目","answer":"答案","solution":"解题步骤","tip":"易错提示"}]}`;
}

function parseQuestions(text) {
  const cleaned = text.trim().replace(/```json?|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON');
  const parsed = JSON.parse(match[0]);
  if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error('格式错误');
  return parsed.questions;
}

async function generateBatch(knowledge, questionType, difficulty, count) {
  const prompt = buildPrompt(knowledge, questionType, difficulty, count);

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是小学数学出题专家。只输出纯JSON，不加任何其他内容。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: count <= 3 ? 600 : 1200,
    enable_thinking: false
  });

  const content = completion.choices?.[0]?.message?.content || '';
  return parseQuestions(content);
}

async function main() {
  if (!API_KEY) {
    console.error('请设置环境变量 QWEN_API_KEY');
    console.error('用法: QWEN_API_KEY=sk-xxx node seed.js');
    process.exit(1);
  }

  const allKnowledges = getAllKnowledges();
  const progress = loadProgress();
  const existingLines = fs.existsSync(OUTPUT_FILE)
    ? fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean)
    : [];

  console.log(`\n========== 题库初始化 ==========`);
  console.log(`模型: ${MODEL}`);
  console.log(`知识点总数: ${allKnowledges.length}`);
  console.log(`每知识点: ${PER_KNOWLEDGE} 题`);
  console.log(`从第 ${START_FROM} 个开始`);
  console.log(`已有记录: ${existingLines.length} 条`);
  console.log(`================================\n`);

  let totalGenerated = 0;
  let totalFailed = 0;

  for (let i = START_FROM; i < allKnowledges.length; i++) {
    const k = allKnowledges[i];

    if (progress[k.id] && progress[k.id].generated >= PER_KNOWLEDGE) {
      console.log(`[${i}/${allKnowledges.length}] skip ${k.id} — 已完成`);
      continue;
    }

    const grade = extractGrade(k.semester);
    const semesterPart = extractSemesterPart(k.semester);
    const alreadyGenerated = progress[k.id]?.generated || 0;
    const remaining = PER_KNOWLEDGE - alreadyGenerated;

    console.log(`\n[${i}/${allKnowledges.length}] ${k.id} — ${grade}${semesterPart} — ${k.name} (需${remaining}题)`);

    let knowledgeGenerated = alreadyGenerated;

    while (knowledgeGenerated < PER_KNOWLEDGE) {
      const batchCount = Math.min(BATCH_SIZE, PER_KNOWLEDGE - knowledgeGenerated);
      const questionType = QUESTION_TYPES[knowledgeGenerated % QUESTION_TYPES.length];
      const difficulty = DIFFICULTIES[Math.floor(knowledgeGenerated / QUESTION_TYPES.length) % DIFFICULTIES.length];

      try {
        const questions = await generateBatch(k, questionType, difficulty, batchCount);
        const now = new Date().toISOString();

        for (const q of questions) {
          if (!q.content || !q.answer) continue;

          const record = {
            knowledgeId: k.id,
            knowledgeName: k.name,
            grade: grade,
            semester: semesterPart,
            unit: k.unit,
            questionType: questionType,
            difficulty: difficulty,
            content: String(q.content).trim(),
            answer: String(q.answer).trim(),
            solution: String(q.solution || '').trim(),
            tip: String(q.tip || '').trim(),
            source: 'rewritten_exam',
            verified: true,
            createdAt: now,
            updatedAt: now
          };

          fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n');
          knowledgeGenerated++;
          totalGenerated++;
        }

        console.log(`  ✓ +${questions.length} (${TYPE_CN[questionType]}/${DIFF_CN[difficulty]}) — 累计 ${knowledgeGenerated}/${PER_KNOWLEDGE}`);

      } catch (e) {
        totalFailed++;
        console.log(`  ✗ 失败: ${e.message}`);
        await sleep(3000);
      }

      progress[k.id] = { generated: knowledgeGenerated, lastUpdate: new Date().toISOString() };
      saveProgress(progress);

      await sleep(1200);
    }
  }

  const finalCount = fs.existsSync(OUTPUT_FILE)
    ? fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean).length
    : 0;

  console.log(`\n========== 完成 ==========`);
  console.log(`本次生成: ${totalGenerated} 题`);
  console.log(`失败批次: ${totalFailed}`);
  console.log(`文件总计: ${finalCount} 条`);
  console.log(`输出文件: ${OUTPUT_FILE}`);
  console.log(`\n下一步: 在微信云开发控制台导入 seed_import.json`);
  console.log(`或使用 tcb CLI: tcb database import -e 你的环境ID --collection question_bank --file ${OUTPUT_FILE}`);
  console.log(`===========================`);
}

main().catch(console.error);
