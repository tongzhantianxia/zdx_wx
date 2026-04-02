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
