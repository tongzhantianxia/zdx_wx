const cloud = require('wx-server-sdk');
const https = require('https'); // ← 改用内置模块，不用node-fetch

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { performSecurityCheck } = require('./security');

// ========== 配置 ==========
const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/chat/completions';
const TIMEOUT_MS = 25000;

// ========== Prompt（精简版）==========
const SYSTEM_PROMPT = `你是小学数学出题专家。
规则：答案必须正确，只输出纯JSON，不加其他内容。`;

const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType } = params;

  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题' };

  // Prompt精简到最短
  return `生成${count}道${grade}${knowledgeName}${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。
数值范围：小数最多两位，除法优先整除。
直接输出JSON：{"questions":[{"id":1,"type":"计算题","content":"题目","answer":"答案","solution":"解题步骤","tip":"易错提示"}]}`;
};

// ========== 用https替代node-fetch ==========
const callDeepSeekAPI = (userPrompt, apiKey) => {
  return new Promise((resolve, reject) => {

    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 800,        // ← 核心修改：3000改成800
      stream: false
    });

    const options = {
      hostname: DEEPSEEK_HOST,
      path: DEEPSEEK_PATH,
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
        console.log('[API耗时]', Date.now() - startTime, 'ms');

        if (res.statusCode !== 200) {
          reject(new Error(`API错误: ${res.statusCode} ${data}`));
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(new Error('响应解析失败: ' + data.slice(0, 200)));
        }
      });
    });

    // 超时处理
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`请求超时（${TIMEOUT_MS/1000}秒）`));
    });

    req.on('error', (e) => {
      console.error('[请求错误]', e.message);
      reject(e);
    });

    req.write(body);
    req.end();
  });
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

// ========== 云函数入口 ==========
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const totalStart = Date.now();

  console.log('[generateQuestions] 开始，参数:', JSON.stringify(event));

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

  // API Key检查
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { success: false, error: '服务配置错误', code: 'CONFIG_ERROR' };
  }

  // 生成题目
  try {
    const { knowledgeId, knowledgeName, grade } = event;
    const { count, difficulty, questionType } = securityResult.data;

    const userPrompt = buildUserPrompt({
      knowledgeName,
      grade: grade || '五年级',
      count,
      difficulty,
      questionType
    });

    console.log('[Prompt长度]', userPrompt.length, '字符');
    console.log('[调用DeepSeek]', new Date().toISOString());

    const apiResponse = await callDeepSeekAPI(userPrompt, apiKey);
    const questions = parseResponse(apiResponse);

    console.log('[总耗时]', Date.now() - totalStart, 'ms');
    console.log('[题目数量]', questions.length);

    return {
      success: true,
      questions,
      meta: {
        knowledgeId,
        knowledgeName,
        grade,
        count: questions.length,
        openid: wxContext.OPENID,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('[生成失败]', error.message);
    console.log('[失败耗时]', Date.now() - totalStart, 'ms');

    return {
      success: false,
      error: error.message || '生成失败',
      code: 'GENERATE_ERROR'
    };
  }
};
