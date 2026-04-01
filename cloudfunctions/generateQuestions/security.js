/**
 * 云函数安全模块
 * 包含：频率限制、参数校验、权限验证
 */

// ==================== 频率限制 ====================

// 内存缓存（注意：云函数实例重启会丢失）
// 生产环境建议使用 Redis 或数据库存储
const rateLimitCache = new Map();

// 渐进出题：同 sessionId 调用次数上限（targetCount + 2）
const sessionLimitCache = new Map();

const SESSION_ID_RE = /^sess_\d{13}_[a-z0-9]{6}$/;
const SESSION_TTL_MS = 5 * 60 * 1000;
const EXISTING_MAX_ITEMS = 10;
const EXISTING_ITEM_MAX_LEN = 200;

/**
 * 清洗已出题干，防止 prompt 膨胀
 * @param {unknown} raw
 * @returns {string[]}
 */
const sanitizeExistingQuestions = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, EXISTING_MAX_ITEMS).map((item) => {
    const s = String(item == null ? '' : item);
    return s.slice(0, EXISTING_ITEM_MAX_LEN);
  });
};

const pruneSessionLimitCache = (now) => {
  for (const [key, rec] of sessionLimitCache) {
    if (now > rec.expiresAt) {
      sessionLimitCache.delete(key);
    }
  }
  if (sessionLimitCache.size > 1000) {
    for (const [key, rec] of sessionLimitCache) {
      if (now > rec.expiresAt) sessionLimitCache.delete(key);
    }
  }
};

/**
 * @param {string} sessionId
 * @param {unknown} targetCountRaw
 * @returns {{ allowed: boolean, code?: string, error?: string, waitTime?: number }}
 */
const checkSessionCallLimit = (sessionId, targetCountRaw) => {
  const now = Date.now();
  pruneSessionLimitCache(now);

  let rec = sessionLimitCache.get(sessionId);
  if (rec && now > rec.expiresAt) {
    sessionLimitCache.delete(sessionId);
    rec = null;
  }

  if (!rec) {
    const tc = parseInt(targetCountRaw, 10);
    if (isNaN(tc) || tc < 1 || tc > 10) {
      return {
        allowed: false,
        code: 'INVALID_PARAMS',
        error: 'targetCount 必须在 1-10'
      };
    }
    rec = {
      maxCalls: tc + 2,
      used: 0,
      expiresAt: now + SESSION_TTL_MS
    };
    sessionLimitCache.set(sessionId, rec);
  }

  if (rec.used >= rec.maxCalls) {
    return {
      allowed: false,
      code: 'RATE_LIMITED',
      error: '本次练习出题次数已达上限，请稍后再试',
      waitTime: 10
    };
  }

  rec.used += 1;
  sessionLimitCache.set(sessionId, rec);
  return { allowed: true };
};

/**
 * 检查调用频率限制
 * @param {string} openid 用户 openid
 * @param {number} limitMs 限制时间（毫秒），默认 10 秒
 * @returns {object} { allowed: boolean, waitTime?: number }
 */
const checkRateLimit = (openid, limitMs = 10000) => {
  const now = Date.now();
  const lastCall = rateLimitCache.get(openid);

  if (lastCall && now - lastCall < limitMs) {
    const waitTime = Math.ceil((limitMs - (now - lastCall)) / 1000);
    console.log(`[RateLimit] 用户 ${openid} 触发频率限制，需等待 ${waitTime} 秒`);
    return {
      allowed: false,
      waitTime
    };
  }

  rateLimitCache.set(openid, now);

  // 清理过期缓存（防止内存泄漏）
  if (rateLimitCache.size > 1000) {
    const expireTime = now - limitMs * 2;
    for (const [key, time] of rateLimitCache) {
      if (time < expireTime) {
        rateLimitCache.delete(key);
      }
    }
  }

  return { allowed: true };
};

// ==================== 参数校验 ====================

/**
 * 合法知识点 ID 列表
 * 来源：utils/knowledgeData.js
 */
const VALID_KNOWLEDGE_IDS = [
  // 上册 - 第1单元 小数乘法
  'upper-1-1', 'upper-1-2', 'upper-1-3', 'upper-1-4',
  // 上册 - 第2单元 位置
  'upper-2-1',
  // 上册 - 第3单元 小数除法
  'upper-3-1', 'upper-3-2', 'upper-3-3', 'upper-3-4',
  // 上册 - 第4单元 可能性
  'upper-4-1', 'upper-4-2',
  // 上册 - 第5单元 简易方程
  'upper-5-1', 'upper-5-2', 'upper-5-3', 'upper-5-4', 'upper-5-5',
  // 上册 - 第6单元 多边形的面积
  'upper-6-1', 'upper-6-2', 'upper-6-3', 'upper-6-4',
  // 上册 - 第7单元 植树问题
  'upper-7-1', 'upper-7-2', 'upper-7-3',
  // 下册 - 第1单元 观察物体
  'lower-1-1',
  // 下册 - 第2单元 因数与倍数
  'lower-2-1', 'lower-2-2', 'lower-2-3', 'lower-2-4', 'lower-2-5', 'lower-2-6',
  // 下册 - 第3单元 长方体和正方体
  'lower-3-1', 'lower-3-2', 'lower-3-3', 'lower-3-4', 'lower-3-5',
  // 下册 - 第4单元 分数的意义和性质
  'lower-4-1', 'lower-4-2', 'lower-4-3', 'lower-4-4', 'lower-4-5', 'lower-4-6', 'lower-4-7',
  // 下册 - 第5单元 分数的加法和减法
  'lower-5-1', 'lower-5-2', 'lower-5-3', 'lower-5-4',
  // 下册 - 第6单元 统计
  'lower-6-1', 'lower-6-2',
  // 下册 - 第7单元 找次品
  'lower-7-1', 'lower-7-2'
];

/**
 * 验证入参格式
 * @param {object} params 入参对象
 * @returns {object} { valid: boolean, error?: string }
 */
const validateParams = (params) => {
  const { knowledgeId, knowledgeName, grade, count, difficulty, questionType } = params;

  // 1. 必填参数检查
  if (!knowledgeName || typeof knowledgeName !== 'string') {
    return { valid: false, error: '知识点名称不能为空' };
  }

  if (knowledgeName.length > 50) {
    return { valid: false, error: '知识点名称过长' };
  }

  // 2. 知识点 ID 白名单检查
  if (knowledgeId && !VALID_KNOWLEDGE_IDS.includes(knowledgeId)) {
    console.warn(`[Validate] 非法的知识点 ID: ${knowledgeId}`);
    // 允许通过，但记录警告（因为 knowledgeId 可选）
  }

  // 3. 题目数量检查
  const numCount = parseInt(count);
  if (isNaN(numCount) || numCount < 1 || numCount > 10) {
    return { valid: false, error: '题目数量必须在 1-10 之间' };
  }

  // 4. 难度枚举检查
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (difficulty && !validDifficulties.includes(difficulty)) {
    return { valid: false, error: '难度参数无效' };
  }

  // 5. 题型枚举检查
  const validQuestionTypes = ['calculation', 'fillBlank', 'application'];
  if (questionType && !validQuestionTypes.includes(questionType)) {
    return { valid: false, error: '题型参数无效' };
  }

  // 6. 年级检查（可选）
  const validGrades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  if (grade && !validGrades.includes(grade)) {
    return { valid: false, error: '年级参数无效' };
  }

  return { valid: true };
};

// ==================== 权限验证 ====================

/**
 * 验证用户登录状态
 * @param {object} wxContext 微信上下文
 * @returns {object} { authorized: boolean, openid?: string, error?: string }
 */
const checkAuth = (wxContext) => {
  const openid = wxContext.OPENID;

  if (!openid) {
    console.warn('[Auth] 未获取到用户 openid');
    return {
      authorized: false,
      error: '请先登录后再使用'
    };
  }

  return {
    authorized: true,
    openid
  };
};

// ==================== 综合安全检查 ====================

/**
 * 执行完整的安全检查
 * @param {object} event 事件参数
 * @param {object} wxContext 微信上下文
 * @returns {object} { passed: boolean, error?: string, data?: object }
 */
const performSecurityCheck = (event, wxContext) => {
  console.log('[Security] 开始安全检查');

  // 1. 权限验证
  const authResult = checkAuth(wxContext);
  if (!authResult.authorized) {
    return {
      passed: false,
      error: authResult.error,
      code: 'UNAUTHORIZED'
    };
  }

  // 2. 参数校验
  const validateResult = validateParams(event);
  if (!validateResult.valid) {
    return {
      passed: false,
      error: validateResult.error,
      code: 'INVALID_PARAMS'
    };
  }

  const sanitizedExistingQuestions = sanitizeExistingQuestions(event.existingQuestions);
  const sessionIdRaw = String(event.sessionId || '').trim();
  const validSessionId = SESSION_ID_RE.test(sessionIdRaw) ? sessionIdRaw : null;

  // 3. 频率限制（有合法 sessionId 时走会话配额，否则走 openid 限频）
  if (validSessionId) {
    const sessionLimit = checkSessionCallLimit(validSessionId, event.targetCount);
    if (!sessionLimit.allowed) {
      return {
        passed: false,
        error: sessionLimit.error,
        code: sessionLimit.code || 'RATE_LIMITED',
        waitTime: sessionLimit.waitTime
      };
    }
  } else {
    const rateLimitResult = checkRateLimit(authResult.openid);
    if (!rateLimitResult.allowed) {
      return {
        passed: false,
        error: `操作过于频繁，请等待 ${rateLimitResult.waitTime} 秒后再试`,
        code: 'RATE_LIMITED',
        waitTime: rateLimitResult.waitTime
      };
    }
  }

  console.log('[Security] 安全检查通过');

  const targetCountNum = parseInt(event.targetCount, 10);
  return {
    passed: true,
    data: {
      openid: authResult.openid,
      count: parseInt(event.count, 10) || 1,
      difficulty: event.difficulty || 'medium',
      questionType: event.questionType || 'calculation',
      sanitizedExistingQuestions,
      sessionId: validSessionId,
      targetCount: !isNaN(targetCountNum) && targetCountNum >= 1 && targetCountNum <= 10
        ? targetCountNum
        : null
    }
  };
};

// ==================== 导出 ====================

module.exports = {
  checkRateLimit,
  validateParams,
  checkAuth,
  performSecurityCheck,
  sanitizeExistingQuestions,
  VALID_KNOWLEDGE_IDS,
  SESSION_ID_RE
};
