const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { performSecurityCheck } = require('./security');

// ========== 配置 ==========
const TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

// 阿里百炼 API 配置
const QWEN_HOST = 'dashscope.aliyuncs.com';
const QWEN_PATH = '/compatible-mode/v1/chat/completions';

// ========== Prompt ==========
const SYSTEM_PROMPT = `你是小学数学出题专家。
规则：答案必须正确，只输出纯JSON，不加其他内容。`;

const buildUserPrompt = (params) => {
  const {
    knowledgeName,
    grade,
    count,
    difficulty,
    questionType,
    existingSummaries,
    prefetchHint
  } = params;

  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题' };

  let text = `生成${count}道${grade}${knowledgeName}${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。
数值范围：小数最多两位，除法优先整除。
直接输出JSON：{"questions":[{"id":1,"type":"计算题","content":"题目","answer":"答案","solution":"解题步骤","tip":"易错提示"}]}`;

  if (Array.isArray(existingSummaries) && existingSummaries.length > 0) {
    text += `\n已出过的题（不要重复）：${existingSummaries.join('、')}`;
  }
  if (prefetchHint) {
    text += `\n出题要求：${prefetchHint}`;
  }
  return text;
};

// ========== 工具函数 ==========
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt) => {
  const jitter = Math.floor(Math.random() * 120);
  return RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + jitter;
};

const isRetryableStatus = (statusCode) => statusCode === 429 || statusCode >= 500;

const isRetryableError = (err) => {
  const code = err && err.code;
  return [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN'
  ].includes(code) || String(err.message || '').includes('请求超时');
};

// ========== 阿里百炼 API 调用 ==========
const callQwenAPIOnce = (userPrompt, apiKey, model, requestId, maxTokens = 800) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      stream: false
    });

    const options = {
      hostname: QWEN_HOST,
      path: QWEN_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const apiLatency = Date.now() - startTime;
        console.log('[QwenAPI]', JSON.stringify({
          requestId,
          model,
          phase: 'http_complete',
          apiLatency,
          statusCode: res.statusCode
        }));

        if (res.statusCode !== 200) {
          const httpError = new Error(`API错误: ${res.statusCode} ${data}`);
          httpError.statusCode = res.statusCode;
          httpError.responseBody = data;
          reject(httpError);
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(new Error('响应解析失败: ' + data.slice(0, 200)));
        }
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`请求超时（${TIMEOUT_MS/1000}秒）`));
    });

    req.on('error', (e) => {
      console.error('[请求错误]', JSON.stringify({
        requestId,
        model,
        message: e.message,
        code: e.code || 'UNKNOWN'
      }));
      reject(e);
    });

    req.write(body);
    req.end();
  });
};

const callQwenAPI = async (userPrompt, apiKey, model, requestId, maxTokens = 800) => {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      console.log('[QwenAPI]', JSON.stringify({
        requestId,
        phase: 'attempt_start',
        model,
        attempt,
        maxAttempt: MAX_RETRIES + 1
      }));
      return await callQwenAPIOnce(userPrompt, apiKey, model, requestId, maxTokens);
    } catch (error) {
      const shouldRetry = attempt <= MAX_RETRIES
        && (isRetryableStatus(error.statusCode) || isRetryableError(error));
      console.error('[QwenAPI]', JSON.stringify({
        requestId,
        phase: 'attempt_error',
        model,
        attempt,
        shouldRetry,
        statusCode: error.statusCode || null,
        code: error.code || null,
        message: error.message
      }));
      if (!shouldRetry) throw error;
      await sleep(getRetryDelay(attempt));
    }
  }
  throw new Error('API 调用失败');
};

// ========== 解析响应 ==========
const parseResponse = (apiResponse) => {
  const content = apiResponse.choices?.[0]?.message?.content;
  if (!content) throw new Error('API响应为空');

  console.log('[原始响应]', content.slice(0, 200));

  // 清理markdown格式
  let jsonStr = content.trim().replace(/```json?|```/g, '').trim();

  // 提取JSON对象
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions?.length) throw new Error('题目列表为空');

  return parsed.questions.map((q, i) => ({
    id: i + 1,
    type: q.type || '计算题',
    content: String(q.content || '').trim(),
    answer: String(q.answer || '').trim(),
    solution: String(q.solution || '').trim(),
    tip: String(q.tip || '').trim()
  }));
};

const normContent = (s) => String(s || '').replace(/\s/g, '');

const isDuplicateAgainstExisting = (question, existingList) => {
  if (!question || !existingList || !existingList.length) return false;
  const n = normContent(question.content);
  return existingList.some((ex) => normContent(ex) === n);
};

// ========== 云函数入口 ==========
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const totalStart = Date.now();
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[generateQuestions] 开始:', JSON.stringify({
    requestId,
    event
  }));

  // 安全检查
  const securityResult = performSecurityCheck(event, wxContext);
  if (!securityResult.passed) {
    return {
      success: false,
      error: securityResult.error,
      code: securityResult.code,
      waitTime: securityResult.waitTime
    };
  }

  // 获取配置
  const apiKey = process.env.QWEN_API_KEY || process.env.AI_API_KEY;
  const modelName = process.env.QWEN_MODEL || 'qwen-turbo';

  if (!apiKey) {
    return {
      success: false,
      error: '服务配置错误：缺少 API Key',
      code: 'CONFIG_ERROR'
    };
  }

  console.log('[模型配置]', JSON.stringify({
    requestId,
    model: modelName,
    hasApiKey: !!apiKey
  }));

  // 生成题目
  try {
    const { knowledgeId, knowledgeName, grade } = event;
    const {
      count,
      difficulty,
      questionType,
      sanitizedExistingQuestions
    } = securityResult.data;

    const prefetchHint = String(event.prefetchHint || '').slice(0, 80);
    const maxTokens = count === 1 ? 300 : 800;

    let userPrompt = buildUserPrompt({
      knowledgeName,
      grade: grade || '五年级',
      count,
      difficulty,
      questionType,
      existingSummaries: sanitizedExistingQuestions,
      prefetchHint: prefetchHint || undefined
    });

    console.log('[Prompt信息]', JSON.stringify({
      requestId,
      promptLength: userPrompt.length,
      maxTokens
    }));

    let apiResponse = await callQwenAPI(userPrompt, apiKey, modelName, requestId, maxTokens);
    let questions = parseResponse(apiResponse);
    let duplicateWarning = false;

    if (
      questions.length > 0
      && isDuplicateAgainstExisting(questions[0], sanitizedExistingQuestions)
    ) {
      const retryPrompt = `${userPrompt}\n必须与已列题目完全不同，不得重复。`;
      apiResponse = await callQwenAPI(
        retryPrompt,
        apiKey,
        modelName,
        `${requestId}_dedup`,
        maxTokens
      );
      questions = parseResponse(apiResponse);
      if (
        questions.length > 0
        && isDuplicateAgainstExisting(questions[0], sanitizedExistingQuestions)
      ) {
        duplicateWarning = true;
      }
    }

    const usage = apiResponse.usage || null;
    const totalLatency = Date.now() - totalStart;

    console.log('[生成成功]', JSON.stringify({
      requestId,
      model: modelName,
      totalLatency,
      questionCount: questions.length,
      usage,
      duplicateWarning
    }));

    return {
      success: true,
      questions,
      meta: {
        knowledgeId,
        knowledgeName,
        grade,
        count: questions.length,
        model: modelName,
        usage,
        openid: wxContext.OPENID,
        generatedAt: new Date().toISOString(),
        duplicateWarning
      }
    };

  } catch (error) {
    console.error('[生成失败]', JSON.stringify({
      requestId,
      model: modelName,
      totalLatency: Date.now() - totalStart,
      code: error.code || null,
      statusCode: error.statusCode || null,
      message: error.message
    }));

    return {
      success: false,
      error: error.message || '生成失败',
      code: 'GENERATE_ERROR'
    };
  }
};
