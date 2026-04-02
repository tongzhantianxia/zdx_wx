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
