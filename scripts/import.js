const fs = require('fs');
const path = require('path');
const config = require('./config');

const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const OUT_DIR = path.join(__dirname, config.outputDirs.rewritten);

const knowledgeDataPath = path.join(__dirname, '..', 'utils', 'knowledgeData.js');
const { getKnowledgeById } = require(knowledgeDataPath);

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  return {};
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

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
        grade: kInfo?.grade || '',
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

  const outFile = path.join(__dirname, 'import_data.json');
  const lines = allRecords.map(r => JSON.stringify(r));
  fs.writeFileSync(outFile, lines.join('\n'));

  console.log(`\n导出完成: ${allRecords.length} 条 → ${outFile}`);
  console.log('使用 tcb database import 命令导入云数据库');
}

main().catch(console.error);
