const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { queryBank } = require('./bankQuery');
const { getDoneIds, recordServed } = require('./userLog');

const TYPE_MAP = { calculation: '计算题', fillBlank: '填空题', application: '应用题' };

function formatBankQuestion(q, index) {
  return {
    id: index + 1,
    type: TYPE_MAP[q.questionType] || q.questionType || '计算题',
    contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.content || '').trim() }],
    diagram: q.diagram || null,
    answer: String(q.answer || '').trim(),
    answerFormat: q.answerFormat || 'number',
    answerUnit: q.answerUnit || '',
    solutionBlocks: q.solutionBlocks || [{ type: 'text', value: String(q.solution || '').trim() }],
    tip: String(q.tip || '').trim(),
    _bankId: q._id
  };
}

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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, error: '请先登录后再使用', code: 'UNAUTHORIZED' };
  }

  if (event.action === 'updateLog') {
    return await handleUpdateLog(event, openid);
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
    const doneIds = await getDoneIds(openid, knowledgeId);
    const bankQuestions = await queryBank({ knowledgeId, questionType, difficulty, doneIds, count: numCount });

    const formatted = bankQuestions.map((q, i) => formatBankQuestion(q, i));
    const sources = [];
    let allQuestions = [];

    if (formatted.length >= numCount) {
      allQuestions = formatted.slice(0, numCount);
      sources.push('question_bank');
    } else {
      if (formatted.length > 0) sources.push('question_bank');

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
        contentBlocks: q.contentBlocks,
        diagram: q.diagram || null,
        answer: q.answer,
        answerFormat: q.answerFormat || 'number',
        answerUnit: q.answerUnit || '',
        solutionBlocks: q.solutionBlocks,
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
