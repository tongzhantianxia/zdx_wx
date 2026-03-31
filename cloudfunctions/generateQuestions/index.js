// 云函数：生成数学练习题
// 调用 DeepSeek API 根据知识点生成题目

const cloud = require('wx-server-sdk');
const fetch = require('node-fetch');
const { performSecurityCheck } = require('./security');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 30000;

/**
 * System Prompt
 */
const SYSTEM_PROMPT = `你是由人民教育出版社认证的小学数学教材研究专家，拥有20年一线教学经验。

## 核心原则
1. 准确性第一：每道题必须自验证答案正确
2. 教材对标：严格遵循人教版知识点定义
3. 唯一答案：杜绝歧义题

## 五年级数值规范
- 小数：0.01~99.99，最多两位
- 整数：1~1000
- 除法：优先整除
- 分数：分母2~12

## 难度标准
- 简单：一步完成，数值简单
- 中等：两步以内，数值适中
- 困难：多步计算，数值较大

## 输出规范
只输出纯JSON，不添加任何其他内容。`;

/**
 * 构建 User Prompt
 */
const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType } = params;

  const difficultyMap = { 'easy': '简单', 'medium': '中等', 'hard': '困难' };
  const typeMap = { 'calculation': '计算题', 'fillBlank': '填空题', 'application': '应用题' };

  return `生成 ${count} 道"${knowledgeName}"练习题。

要求：
- 年级：${grade}
- 题型：${typeMap[questionType] || '计算题'}
- 难度：${difficultyMap[difficulty] || '中等'}

输出格式：
{"questions":[{"id":1,"type":"题型","content":"题目","answer":"答案","solution":"解答","tip":"提示"}]}`;
};

/**
 * 调用 DeepSeek API
 */
const callDeepSeekAPI = async (userPrompt, apiKey) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * 解析 API 响应
 */
const parseResponse = (apiResponse) => {
  const content = apiResponse.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 响应格式错误');

  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?|```/g, '').trim();
  }

  const parsed = JSON.parse(jsonStr);
  if (!parsed.questions?.length) throw new Error('未生成有效题目');

  return parsed.questions.map((q, i) => ({
    id: i + 1,
    type: q.type || '计算题',
    content: String(q.content || '').trim(),
    answer: String(q.answer || '').trim(),
    solution: String(q.solution || '').trim(),
    tip: String(q.tip || '').trim(),
    difficulty: q.difficulty || '中等'
  }));
};

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  console.log('[generateQuestions] 请求参数:', event);

  // ========== 安全检查 ==========
  const securityResult = performSecurityCheck(event, wxContext);

  if (!securityResult.passed) {
    return {
      success: false,
      error: securityResult.error,
      code: securityResult.code,
      waitTime: securityResult.waitTime
    };
  }

  // ========== API Key 检查 ==========
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('[generateQuestions] 未配置 DEEPSEEK_API_KEY');
    return {
      success: false,
      error: '服务配置错误',
      code: 'CONFIG_ERROR'
    };
  }

  // ========== 生成题目 ==========
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

    console.log('[generateQuestions] 调用 DeepSeek API...');
    const apiResponse = await callDeepSeekAPI(userPrompt, apiKey);
    const questions = parseResponse(apiResponse);

    console.log('[generateQuestions] 生成成功，共', questions.length, '道题');

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
    console.error('[generateQuestions] 生成失败:', error);

    return {
      success: false,
      error: error.message || '生成失败',
      code: 'GENERATE_ERROR'
    };
  }
};
