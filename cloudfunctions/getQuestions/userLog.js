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
