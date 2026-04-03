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

const SYSTEM_PROMPT = `你是一个小学数学试卷识别助手。请分析图片中的数学题目，返回 JSON 格式结果。

要求：
1. 识别每道独立的题目，按顺序编号
2. 提取完整题目文本，包含所有条件和问题
3. 如果题目包含图形/图表，用文字详细描述图形内容
4. 标注每道题在图片中的位置（top 和 bottom，0-1 之间的比例值）
5. 分析每道题对应的数学知识点（参考人教版小学数学）
6. 评估难度：easy（基础计算/概念）、medium（需要多步推理）、hard（综合应用/拓展）

只输出纯JSON，不加其他内容。格式：
{"questions":[{"index":1,"content":"完整题目文本","position":{"top":0.0,"bottom":0.0},"knowledgePoint":"知识点名称","difficulty":"easy|medium|hard","hasGraphic":false,"graphicDesc":null}]}`;

function buildUserPrompt(grade) {
  return `请识别这张${grade}数学试卷/作业中的所有题目。`;
}

function parseOcrResponse(content) {
  if (!content) throw new Error('API响应为空');
  console.log('[OCR原始响应]', content.slice(0, 300));

  let jsonStr = content.trim().replace(/```json?|```/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('题目列表格式错误');
  }
  return parsed.questions.map((q, i) => ({
    index: q.index || i + 1,
    content: String(q.content || '').trim(),
    position: {
      top: Math.max(0, Math.min(1, Number(q.position?.top) || 0)),
      bottom: Math.max(0, Math.min(1, Number(q.position?.bottom) || 1))
    },
    knowledgePoint: String(q.knowledgePoint || '').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    hasGraphic: !!q.hasGraphic,
    graphicDesc: q.hasGraphic ? String(q.graphicDesc || '').trim() || null : null
  }));
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const requestId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[ocrRecognize] 开始:', JSON.stringify({ requestId, fileID: event.fileID, grade: event.grade }));

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

  const { fileID, grade, semester } = event;
  if (!fileID || !grade) {
    return { success: false, error: '缺少必要参数', code: 'INVALID_PARAMS' };
  }

  const validGrades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  if (!validGrades.includes(grade)) {
    return { success: false, error: '年级参数无效', code: 'INVALID_PARAMS' };
  }

  const validSemesters = ['upper', 'lower'];
  if (semester && !validSemesters.includes(semester)) {
    return { success: false, error: '学期参数无效', code: 'INVALID_PARAMS' };
  }

  const apiKey = process.env.QWEN_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: '服务配置错误', code: 'CONFIG_ERROR' };
  }

  // Track upload for cleanup
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

    console.log('[ocrRecognize] 图片下载完成, size:', buffer.length);

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      timeout: 50000,
      maxRetries: 1
    });

    const userPrompt = buildUserPrompt(grade);

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
                { type: 'text', text: userPrompt }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4096
        });

        const content = completion.choices?.[0]?.message?.content;
        questions = parseOcrResponse(content);
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

    const effectiveSemester = semester || 'upper';
    const enriched = questions.map(q => {
      const match = matchKnowledge(q.knowledgePoint, grade, effectiveSemester);
      return { ...q, knowledgeId: match.knowledgeId, knowledgeName: match.knowledgeName };
    });

    console.log('[ocrRecognize] 完成:', JSON.stringify({
      requestId, questionCount: enriched.length,
      matchedCount: enriched.filter(q => q.knowledgeId).length
    }));

    return { success: true, questions: enriched };

  } catch (error) {
    console.error('[ocrRecognize] 失败:', JSON.stringify({
      requestId, message: error.message, status: error.status || null
    }));

    let userMessage = '识别失败，请重新拍照';
    if (error.status === 429) userMessage = '请求过于频繁，请稍后再试';
    else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') userMessage = '网络超时，请重试';

    return { success: false, error: userMessage, code: 'OCR_ERROR' };
  }
};
