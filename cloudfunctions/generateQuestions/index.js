const cloud = require('wx-server-sdk');
const OpenAI = require('openai');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { performSecurityCheck } = require('./security');

// ========== 配置 ==========
const MAX_RETRIES = 2;
const TIMEOUT_MS = 25000;

// ========== Prompt ==========
const SYSTEM_PROMPT = `你是小学数学出题专家。你要生成结构化JSON格式的题目，支持LaTeX公式和几何图形。

规则：
1. 答案必须正确
2. 只输出纯JSON，不加其他内容
3. contentBlocks中，数学表达式用latex类型（如分数用 \\frac{1}{2}），普通文字用text类型
4. solutionBlocks同理，解题步骤中的公式用latex类型
5. 几何题必须提供diagram字段
6. answerFormat：纯数字用number，分数答案用fraction，文字答案用text

LaTeX常用语法：
- 分数：\\frac{分子}{分母}
- 乘号：\\times
- 除号：\\div
- 角度：\\angle
- 平方：x^2
- 根号：\\sqrt{x}
- 文字单位：\\text{cm}`;

const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType, existingSummaries, prefetchHint } = params;
  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题', geometry: '几何题' };

  let text = `生成${count}道${grade}${knowledgeName}${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。

输出JSON格式：
{"questions":[{
  "id": 1,
  "type": "${typeMap[questionType] || '计算题'}",
  "contentBlocks": [{"type":"text","value":"题目文字"},{"type":"latex","value":"\\\\frac{1}{2}"}],
  "diagram": null,
  "answer": "答案",
  "answerFormat": "number",
  "answerUnit": "",
  "solutionBlocks": [{"type":"text","value":"解题步骤"},{"type":"latex","value":"公式"}],
  "tip": "易错提示"
}]}`;

  if (questionType === 'geometry') {
    text += `

几何题的diagram格式：
{"type":"geometry","width":250,"height":200,"shapes":[...],"labels":[...],"annotations":[...]}

2D shapes: polygon(points数组), circle(center,radius), line(from,to), dashed(from,to)
3D shapes: cuboid(origin,length,width,height), cube(origin,size), cylinder(origin,radius,height), cone(origin,radius,height)
3D shape可选: hiddenEdges(默认true), faceFills([{face:"front",fill:"rgba(...)"}])
annotations: rightAngle(vertex,dir1,dir2,size), shade(points,fill), dimensionLine(from,to,text,offset)
labels: {text,position:[x,y],fontSize}

坐标规则：
- 所有坐标在[0,width]x[0,height]范围内
- 3D图形origin的x建议40-80，y建议height-30到height-50
- labels之间间隔至少20px

长方体模板（可直接使用，调整数值）：
{"type":"cuboid","origin":[60,160],"length":100,"width":60,"height":80,"stroke":"#333","fill":"transparent","hiddenEdges":true}`;
  }

  if (Array.isArray(existingSummaries) && existingSummaries.length > 0) {
    text += `\n已出过的题（不要重复）：${existingSummaries.join('、')}`;
  }
  if (prefetchHint) {
    text += `\n出题要求变化：${prefetchHint}`;
  }
  return text;
};

// ========== 解析与校验 ==========
const VALID_BLOCK_TYPES = ['text', 'latex'];
const VALID_SHAPE_TYPES = ['polygon', 'circle', 'line', 'arc', 'dashed', 'cuboid', 'cube', 'cylinder', 'cone', 'sphere'];

const validateContentBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  return blocks.every(b => VALID_BLOCK_TYPES.includes(b.type) && typeof b.value === 'string' && b.value.length > 0);
};

const validateDiagram = (d) => {
  if (!d) return true;
  if (!d.width || !d.height || !Array.isArray(d.shapes)) return false;
  return d.shapes.every(s => VALID_SHAPE_TYPES.includes(s.type));
};

const validateLatexBrackets = (str) => {
  let depth = 0;
  for (const ch of str) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
};

const validateQuestion = (q) => {
  if (!validateContentBlocks(q.contentBlocks)) return false;
  if (!validateDiagram(q.diagram)) return false;
  const allLatex = (q.contentBlocks || [])
    .concat(q.solutionBlocks || [])
    .filter(b => b.type === 'latex');
  return allLatex.every(b => validateLatexBrackets(b.value));
};

const parseResponse = (content) => {
  if (!content) throw new Error('API响应为空');
  console.log('[原始响应]', content.slice(0, 300));

  let jsonStr = content.trim().replace(/```json?|```/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions?.length) throw new Error('题目列表为空');

  return parsed.questions
    .map((q, i) => ({
      id: i + 1,
      type: q.type || '计算题',
      contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.content || '').trim() }],
      diagram: q.diagram || null,
      answer: String(q.answer || '').trim(),
      answerFormat: q.answerFormat || 'number',
      answerUnit: q.answerUnit || '',
      solutionBlocks: q.solutionBlocks || [{ type: 'text', value: String(q.solution || '').trim() }],
      tip: String(q.tip || '').trim()
    }))
    .filter(q => {
      const valid = validateQuestion(q);
      if (!valid) console.warn('[parseResponse] 题目校验失败，丢弃:', q.id);
      return valid;
    });
};

const extractTextFromBlocks = (blocks) => {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(b => b.value || '').join('');
};

const normContent = (s) => String(s || '').replace(/\s/g, '');

const isDuplicate = (question, existingList) => {
  if (!question || !existingList || !existingList.length) return false;
  const n = normContent(extractTextFromBlocks(question.contentBlocks));
  return existingList.some((ex) => normContent(ex) === n);
};

// ========== 调用大模型 ==========
const callModel = async (client, modelName, userPrompt, maxTokens, requestId) => {
  console.log('[callModel]', JSON.stringify({ requestId, model: modelName, promptLen: userPrompt.length, maxTokens }));

  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
    enable_thinking: false
  });

  return completion;
};

// ========== 云函数入口 ==========
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const totalStart = Date.now();
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[generateQuestions] 开始:', JSON.stringify({ requestId, event }));

  let securityData;

  if (event._internal === true) {
    const { validateParams, sanitizeExistingQuestions, checkSessionCallLimit, SESSION_ID_RE } = require('./security');
    const vResult = validateParams(event);
    if (!vResult.valid) {
      return { success: false, error: vResult.error, code: 'INVALID_PARAMS' };
    }
    const sessionIdRaw = String(event.sessionId || '').trim();
    const validSessionId = SESSION_ID_RE.test(sessionIdRaw) ? sessionIdRaw : null;
    if (validSessionId) {
      const sessionLimit = checkSessionCallLimit(validSessionId, event.targetCount);
      if (!sessionLimit.allowed) {
        return { success: false, error: sessionLimit.error, code: sessionLimit.code || 'RATE_LIMITED', waitTime: sessionLimit.waitTime };
      }
    }
    securityData = {
      openid: event._openid || 'internal',
      count: parseInt(event.count, 10) || 1,
      difficulty: event.difficulty || 'medium',
      questionType: event.questionType || 'calculation',
      sanitizedExistingQuestions: sanitizeExistingQuestions(event.existingQuestions),
      sessionId: validSessionId,
      targetCount: parseInt(event.targetCount, 10) || null
    };
  } else {
    const securityResult = performSecurityCheck(event, wxContext);
    if (!securityResult.passed) {
      return {
        success: false,
        error: securityResult.error,
        code: securityResult.code,
        waitTime: securityResult.waitTime
      };
    }
    securityData = securityResult.data;
  }

  const apiKey = process.env.QWEN_API_KEY || process.env.AI_API_KEY;
  const modelName = process.env.QWEN_MODEL || 'qwen-turbo';

  if (!apiKey) {
    return { success: false, error: '服务配置错误：缺少 API Key', code: 'CONFIG_ERROR' };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES
  });

  console.log('[模型配置]', JSON.stringify({ requestId, model: modelName, hasApiKey: true }));

  try {
    const { knowledgeId, knowledgeName, grade } = event;
    const { count, difficulty, questionType, sanitizedExistingQuestions } = securityData;
    const prefetchHint = String(event.prefetchHint || '').slice(0, 80);
    const maxTokens = count === 1 ? 800 : 2000;

    const userPrompt = buildUserPrompt({
      knowledgeName,
      grade: grade || '五年级',
      count,
      difficulty,
      questionType,
      existingSummaries: sanitizedExistingQuestions,
      prefetchHint: prefetchHint || undefined
    });

    let completion = await callModel(client, modelName, userPrompt, maxTokens, requestId);
    let content = completion.choices?.[0]?.message?.content;
    let questions = parseResponse(content);
    let duplicateWarning = false;

    if (questions.length > 0 && isDuplicate(questions[0], sanitizedExistingQuestions)) {
      const retryPrompt = `${userPrompt}\n必须与已列题目完全不同，不得重复。`;
      completion = await callModel(client, modelName, retryPrompt, maxTokens, `${requestId}_dedup`);
      content = completion.choices?.[0]?.message?.content;
      questions = parseResponse(content);
      if (questions.length > 0 && isDuplicate(questions[0], sanitizedExistingQuestions)) {
        duplicateWarning = true;
      }
    }

    const usage = completion.usage || null;
    const totalLatency = Date.now() - totalStart;

    console.log('[生成成功]', JSON.stringify({
      requestId, model: modelName, totalLatency, questionCount: questions.length, usage, duplicateWarning
    }));

    return {
      success: true,
      questions,
      meta: {
        knowledgeId, knowledgeName, grade,
        count: questions.length,
        model: modelName,
        usage,
        openid: wxContext.OPENID,
        generatedAt: new Date().toISOString(),
        duplicateWarning
      }
    };

  } catch (error) {
    const totalLatency = Date.now() - totalStart;
    console.error('[生成失败]', JSON.stringify({
      requestId, model: modelName, totalLatency,
      status: error.status || null,
      code: error.code || null,
      message: error.message
    }));

    let userMessage = '生成失败，请稍后重试';
    if (error.status === 429) userMessage = '请求过于频繁，请稍后再试';
    else if (error.status === 401) userMessage = '服务配置错误，请联系管理员';
    else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') userMessage = '网络超时，请重试';

    return {
      success: false,
      error: userMessage,
      code: 'GENERATE_ERROR'
    };
  }
};
