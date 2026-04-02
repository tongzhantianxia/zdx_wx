module.exports = {
  apiKey: process.env.QWEN_API_KEY || '',
  model: process.env.QWEN_MODEL || 'qwen-turbo',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',

  crawlTargets: [
    {
      name: '学科网免费区',
      baseUrl: 'https://www.zxxk.com',
      searchPath: '/soft/free',
      enabled: true
    }
  ],

  crawlDelay: { min: 2000, max: 5000 },

  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],

  outputDirs: {
    raw: 'raw_questions',
    rewritten: 'rewritten_questions'
  },

  perKnowledgeTarget: 30
};
