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

    console.log(`[crawl] ${k.id} - ${k.name} (${k.grade} ${k.semester})`);
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
