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

const SYSTEM_PROMPT = `你是小学数学试卷批改助手。请识别图片中每道题目，判断作答状态，并分析知识点。
只输出纯JSON，不加任何其他内容。格式：
{"questions":[{"index":1,"content":"完整题目文本","status":"unanswered|wrong|correct","brief":"题目开头10个字","position":{"top":0.0,"bottom":0.0},"grade":"X年级","semester":"upper或lower","knowledgePoint":"知识点名称","difficulty":"easy|medium|hard","hasGraphic":false,"graphicDesc":null}]}

status判断规则：
- unanswered: 题目没有写答案，空白未作答
- wrong: 有答案但明显错误（如计算错误、答案不合理），或者有老师批改的叉号/红色标记
- correct: 答案正确，或有老师批改的勾号

position: top/bottom是题目区域在图片高度中的比例(0-1)
grade: 根据题目内容判断属于几年级(一年级~六年级)
semester: 根据知识点判断属于上册(upper)还是下册(lower)
difficulty: easy=基础计算, medium=多步推理, hard=综合应用`;

const VALID_GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

function parseResponse(content) {
  if (!content) throw new Error('API响应为空');
  console.log('[OCR响应]', content.slice(0, 500));

  let jsonStr = content.trim().replace(/```json?|```/g, '').trim();
  const thinkEnd = jsonStr.lastIndexOf('</think>');
  if (thinkEnd !== -1) jsonStr = jsonStr.slice(thinkEnd + 8).trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('题目列表格式错误');
  }
  return parsed.questions.map((q, i) => {
    let grade = String(q.grade || '').trim();
    if (!VALID_GRADES.includes(grade)) grade = '五年级';
    let semester = String(q.semester || '').trim();
    if (!['upper', 'lower'].includes(semester)) semester = 'upper';
    let status = String(q.status || '').trim();
    if (!['unanswered', 'wrong', 'correct'].includes(status)) status = 'unanswered';

    return {
      index: q.index || i + 1,
      content: String(q.content || '').trim(),
      brief: String(q.brief || '').trim().slice(0, 20),
      status,
      position: {
        top: Math.max(0, Math.min(1, Number(q.position?.top) || 0)),
        bottom: Math.max(0, Math.min(1, Number(q.position?.bottom) || 1))
      },
      grade,
      semester,
      knowledgePoint: String(q.knowledgePoint || '').trim(),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      hasGraphic: !!q.hasGraphic,
      graphicDesc: q.hasGraphic ? String(q.graphicDesc || '').trim() || null : null
    };
  });
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const requestId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[ocrRecognize]', JSON.stringify({ requestId, fileID: event.fileID }));

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

  const { fileID } = event;
  if (!fileID) {
    return { success: false, error: '缺少必要参数', code: 'INVALID_PARAMS' };
  }

  const apiKey = process.env.QWEN_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: '服务配置错误', code: 'CONFIG_ERROR' };
  }

  try {
    const db = cloud.database();
    await db.collection('ocr_uploads').add({
      data: { fileID, openid, uploadedAt: new Date() }
    });
  } catch (trackErr) {
    console.warn('[ocrRecognize] track upload error:', trackErr.message);
  }

  try {
    const fileRes = await cloud.downloadFile({ fileID });
    const buffer = fileRes.fileContent;
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    console.log('[ocrRecognize] 图片大小:', buffer.length);

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      timeout: 50000,
      maxRetries: 1
    });

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
                { type: 'text', text: '请识别这张小学数学试卷中的所有题目，判断每道题的作答状态（未答/错误/正确），并分析知识点。' }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4096
        });

        const content = completion.choices?.[0]?.message?.content;
        questions = parseResponse(content);
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

    const enriched = questions.map(q => {
      const km = matchKnowledge(q.knowledgePoint, q.grade, q.semester);
      return { ...q, knowledgeId: km.knowledgeId, knowledgeName: km.knowledgeName };
    });

    const needImprove = enriched.filter(q => q.status !== 'correct');

    console.log('[ocrRecognize] 完成:', JSON.stringify({
      requestId,
      total: enriched.length,
      needImprove: needImprove.length
    }));

    return { success: true, questions: enriched, needImprove };

  } catch (error) {
    console.error('[ocrRecognize] 失败:', error.message);
    let userMessage = '识别失败，请重新拍照';
    if (error.status === 429) userMessage = '请求过于频繁，请稍后再试';
    else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') userMessage = '网络超时，请重试';
    return { success: false, error: userMessage, code: 'OCR_ERROR' };
  }
};
