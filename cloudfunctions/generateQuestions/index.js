const cloud = require('wx-server-sdk');
const OpenAI = require('openai');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { performSecurityCheck } = require('./security');

// ========== 配置 ==========
const MAX_RETRIES = 2;
const TIMEOUT_MS = 25000;

// ========== Prompt ==========
const SYSTEM_PROMPT = `你是小学数学出题专家，专门为小学生生成数学练习题。

【核心原则 - 严格遵守】
1. 答案必须正确且唯一
2. 只输出纯JSON，不加其他内容
3. 题目难度必须严格匹配指定年级，绝不超纲
4. 禁止出现该年级未学过的任何知识点！

【年级知识范围 - 精确限制】

一年级上册：
- 20以内加减法（不进位、不退位）
- 1-20认识数字
- 简单图形认识：正方形、圆形、三角形
- 比较：大小、长短、高矮

一年级下册：
- 20以内进位加法、退位减法
- 认识人民币：1角、5角、1元
- 认识钟表：整时、半时
- 找规律填数

二年级上册：
- 100以内加减法
- 乘法意义：初步认识（用加法表示乘法）
- 长度单位：厘米、米
- 认识时间：整时、半时、几点几分

二年级下册：
- 表内乘法：1-9乘法口诀
- 表内除法
- 认识角：直角、锐角、钝角
- 千以内数的认识

三年级上册：
- 万以内加减法
- 有余数的除法
- 认识分数：初步认识几分之一
- 乘法：两三位数乘一位数

三年级下册：
- 除法：两位数除一位数
- 乘法：两位数乘两位数
- 面积：正方形、长方形面积
- 认识小数：简单小数

四年级上册：
- 大数认识：亿以内数
- 三位数乘两位数
- 垂直与平行
- 运算律：加法交换律、结合律

四年级下册：
- 小数：小数意义、性质、小数加减
- 三角形：分类、特性
- 方程：初步认识（用字母表示数）
- 统计：平均数

五年级上册：
- 小数乘法：小数乘整数、整数乘小数
- 小数除法
- 方程：解简易方程
- 多边形面积：平行四边形、三角形、梯形

五年级下册：
- 因数与倍数
- 分数：分数的意义、性质
- 长方体和正方体：认识、表面积、体积
- 统计：折线统计图

六年级上册：
- 分数乘法、除法
- 比：比的意义、基本性质
- 圆：圆的认识、周长、面积
- 百分数：百分数的意义和应用

六年级下册：
- 负数
- 比例：比例的意义、基本性质
- 圆柱与圆锥
- 统计：扇形统计图

【题目要求 - 必须遵守】

内容规范：
- 题目必须纯文字就能理解，无需看图、看表
- 所有数据在题目中明确给出，禁止"如图所示""如下表"
- 避免使用复杂句式，主语要明确
- 数字要简单：整数为主，分数用 \\frac{1}{2} 这种简单形式
- 答案必须是可以计算出的具体数字或文字

格式规范：
- contentBlocks用text类型写题目文字，简单表达式直接写在text里
- 只有复杂公式用latex类型（分数 \\frac{a}{b}、根号 \\sqrt{x}）
- 一二年级禁止使用latex！全部用text类型
- answerFormat：纯数字用number，分数答案用fraction，文字答案用text
- diagram设为null
- 数轴题用numberLine字段：{start,end,step,highlightPoints:[],labels:[]}

【禁止出现的内容 - 绝对禁止】

- 二年级及以上禁止出现：方程、设未知数x
- 三年级及以上禁止出现：小数乘法、小数除法
- 全部年级禁止出现：负数、比例、百分数（除非题目明确要求）
- 全部年级禁止出现：分数加减乘除混合运算（五年级下册除外）
- 全部年级禁止出现：根号运算、开方
- 全部年级禁止出现：幂运算、指数
- 应用题禁止出现：价格计��（除非是简单的人民币认识）
- 全部年级禁止出现：需要单位换算的应用题（除非是简单的人民币）`;

// 需要图形题的知识点关键词（精确匹配）
const NEED_GEOMETRY_DIAGRAM = [
  '认识图形', '平面图形', '正方形', '长方形', '三角形', '圆形', '圆',
  '四边形', '认识四边形', '四边形的认识',
  '认识角', '直角', '锐角', '钝角', '平行四边形', '梯形', '多边形',
  '周长', '面积', '表面积', '体积', '长方体', '正方体', '圆柱', '圆锥', '球',
  '观察物体', '从不同方向看', '搭立体图形', '数形结合',
  '分数', '分数的意义', '几分之一', '几分之几', '分数比较',
  '数轴', '认识小数', '小数的意义',
  '位置', '方向与位置', '东南西北', '坐标'
];

// 需要数轴的知识点关键词
const NEED_NUMBER_LINE = [
  '数轴', '认识小数', '小数的意义', '负数', '分数的比较', '数的大小比较',
  '正负数', '有理数'
];

// 需要分数条的知识点（三年级认识分数）
const NEED_FRACTION_BAR = [
  '分数', '分数的意义', '几分之一', '几分之几', '分数比较', '分数单位',
  '分数的初步认识', '认识分数'
];

const findDiagrams = (knowledgeName) => {
  const kn = knowledgeName || '';
  const need = [];
  
  if (NEED_GEOMETRY_DIAGRAM.some(k => kn.includes(k))) {
    need.push('geometry');
  }
  if (NEED_NUMBER_LINE.some(k => kn.includes(k))) {
    need.push('numberLine');
  }
  if (NEED_FRACTION_BAR.some(k => kn.includes(k))) {
    need.push('fractionBar');
  }
  
  return need;
};

const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType, existingSummaries, prefetchHint } = params;
  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题', geometry: '几何题' };

  // 判断需要哪种图形
  const requiredDiagrams = findDiagrams(knowledgeName);
  const useNumberLine = requiredDiagrams.includes('numberLine');
  const useFractionBar = requiredDiagrams.includes('fractionBar');
  const useGeometry = requiredDiagrams.includes('geometry');

  let text = `生成${count}道${grade}「${knowledgeName}」${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。
严格限制在${grade}知识范围内，不得超纲。

【重要】该知识点需要图形：${useNumberLine ? '数轴 ' : ''}${useFractionBar ? '分数条 ' : ''}${useGeometry ? '几何图 ' : ''}

输出JSON格式：
{"questions":[{
  "id": 1,
  "type": "${typeMap[questionType] || '计算题'}",
  "contentBlocks": [{"type":"text","value":"题目完整文字"}],
  "diagram": ${useGeometry ? '{}占位，实际图形在下面定义"' : 'null'},
  "numberLine": ${useNumberLine ? '{start:0,end:10,step:1,highlightPoints:[],labels:[]}' : 'null'},
  "answer": "答案",
  "answerFormat": "number",
  "answerUnit": "",
  "solutionBlocks": [{"type":"text","value":"解题步骤"}],
  "tip": "易错提示"
}]}`;

  // 在几何题输出格式后面添加实际diagram定义示例
  if (useGeometry) {
    text += `

【警告】必须生成diagram字段！示例：
{"type":"geometry","width":250,"height":180,"shapes":[{"type":"polygon","points":[[40,140],[140,140],[140,40],[40,40]],"stroke":"#333"}],"labels":[{"text":"长方形","position":[90,25],"fontSize":14}],"annotations":[]}`;
  }

  // 数轴题输出格式
  if (useNumberLine) {
    text += `

【数轴题格式】（必须包含numberLine字段）：
- start/end/step定义数轴范围
- highlightPoints标记需要操作的点，如[3,5]
- labels添加标签：[{position:3,text:"3",above:true}]
- 题目中必须提到数轴上的点`;
  }

  // 分数条格式
  if (useFractionBar) {
    text += `

【分数条题格式】（使用diagram字段）：
- diagram: {"type":"fractionBar","numerator":3,"denominator":4}
- 用于展示分数的几分之几`;
  }

  // ��何题diagram格式
  if (useGeometry) {
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

const validateNumberLine = (nl) => {
  if (!nl) return true;
  if (typeof nl.start !== 'number' || typeof nl.end !== 'number' || typeof nl.step !== 'number') return false;
  if (nl.start >= nl.end || nl.step <= 0) return false;
  if (!Array.isArray(nl.highlightPoints)) return false;
  if (!Array.isArray(nl.labels)) return false;
  return true;
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
  if (!validateNumberLine(q.numberLine)) return false;
  const allLatex = (q.contentBlocks || [])
    .concat(q.solutionBlocks || [])
    .filter(b => b.type === 'latex');
  return allLatex.every(b => validateLatexBrackets(b.value));
};

const parseResponse = (content) => {
  if (!content) throw new Error('API响应为空');
  console.log('[原始响应]', content.slice(0, 300));

  let jsonStr = content.trim();
  const thinkEnd = jsonStr.lastIndexOf('</think>');
  if (thinkEnd !== -1) jsonStr = jsonStr.slice(thinkEnd + 8).trim();
  jsonStr = jsonStr.replace(/```json?|```/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions || !parsed.questions.length) throw new Error('题目列表为空');

  return parsed.questions
    .map((q, i) => {
      let blocks = q.contentBlocks;
      if (!validateContentBlocks(blocks)) {
        const fallbackText = String(q.content || q.question || '').trim();
        blocks = fallbackText ? [{ type: 'text', value: fallbackText }] : null;
      }
      let diagram = q.diagram;
      if (diagram && !validateDiagram(diagram)) {
        console.warn('[parseResponse] diagram无效，已忽略:', typeof diagram === 'string' ? diagram.slice(0, 80) : JSON.stringify(diagram).slice(0, 80));
        diagram = null;
      }
      let solution = q.solutionBlocks;
      if (!Array.isArray(solution) || solution.length === 0) {
        const solText = String(q.solution || q.explanation || '').trim();
        solution = solText ? [{ type: 'text', value: solText }] : [{ type: 'text', value: '略' }];
      }
      return {
        id: i + 1,
        type: q.type || '计算题',
        contentBlocks: blocks,
        diagram: diagram,
        answer: String(q.answer || '').trim(),
        answerFormat: q.answerFormat || 'number',
        answerUnit: q.answerUnit || '',
        solutionBlocks: solution,
        tip: String(q.tip || '').trim()
      };
    })
    .filter(q => {
      if (!validateContentBlocks(q.contentBlocks)) {
        console.warn('[parseResponse] 题目无有效内容，丢弃:', q.id);
        return false;
      }
      if (!q.answer) {
        console.warn('[parseResponse] 题目无答案，丢弃:', q.id);
        return false;
      }
      const allLatex = (q.contentBlocks || [])
        .concat(q.solutionBlocks || [])
        .filter(b => b.type === 'latex');
      if (!allLatex.every(b => validateLatexBrackets(b.value))) {
        console.warn('[parseResponse] LaTeX括号不匹配，丢弃:', q.id);
        return false;
      }
      return true;
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
