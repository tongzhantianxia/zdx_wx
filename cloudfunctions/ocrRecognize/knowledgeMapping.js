const knowledgeData = require('./knowledgeData.js').knowledgeData;

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
