const cloud = require('wx-server-sdk');
const OpenAI = require('openai');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { performSecurityCheck } = require('./security');

// ========== 配置 ==========
const MAX_RETRIES = 2;
const TIMEOUT_MS = 25000;

// ========== Prompt ==========
const SYSTEM_PROMPT_BASE = `你是小学数学出题专家，专门为小学生生成数学练习题。

【核心原则 - 严格遵守】
1. 答案必须正确且唯一
2. 只输出纯JSON，不加其他内容
3. 题目难度必须严格匹配指定年级，绝不超纲
4. 禁止出现该年级未学过的任何知识点！
5. 生成后必须验算答案！严禁出现计算错误（如16+18=28这种低级错误）
6. solutionBlocks中的每一步计算都必须正确，最终结果必须与answer一致
7. 题目、选项、答案、解析全部使用中文，禁止出现任何英文字母或英文单词
8. 每道题必须与其他题有明显区别，禁止仅换数字的重复题`;

const GRADE_SCOPES = {
  '一年级上册': `- 1-20认识数字、0的认识
- 20以内加减法（不进位、不退位）
- 连加连减、加减混合
- 比较：大小、长短、高矮
- 认识立体图形：长方体、正方体、圆柱、球
- 简单图形认识：正方形、圆形、三角形
- 认识整时（钟表）`,

  '一年级下册': `- 20以内进位加法、退位减法
- 100以内数的认识：数数、数的组成、读数写数、比较大小
- 认识人民币：1角、5角、1元、简单的计算
- 认识钟表：整时、半时
- 认识平面图形：长方形、正方形、三角形、圆形
- 图形的拼组
- 分类与整理：简单分类
- 找规律：图形规律、数字规律`,

  '二年级上册': `- 100以内加减法：两位数加减两位数、连加连减、加减混合
- 长度单位：厘米、米、认识线段
- 角的初步认识：认识角、直角
- 乘法意义：初步认识（用加法表示乘法）
- 表内乘法：2-9的乘法口诀
- 认识时间：整时、半时、几点几分
- 观察物体
- 数学广角：简单的排列组合`,

  '二年级下册': `- 数据收集整理：简单的统计
- 表内除法
- 混合运算：没有括号的混合运算、有括号的混合运算
- 有余数的除法
- 万以内数的认识：1000以内、10000以内、整百整千数加减法
- 克和千克
- 图形的运动：轴对称、平移
- 数学广角：简单的推理`,

  '三年级上册': `- 时、分、秒
- 万以内加减法：口算、笔算
- 测量：毫米、分米、千米、吨
- 有余数的除法
- 倍的认识：求一个数是另一个数的几倍、求一个数的几倍是多少
- 乘法：两三位数乘一位数（口算、笔算、估算）
- 长方形和正方形：四边形的认识、周长
- 认识分数：初步认识几分之一、分数的简单计算
- 数学广角：集合的思想方法（韦恩图、重叠问题）`,

  '三年级下册': `- 位置与方向：东南西北、东北东南西北西南
- 除法：两位数除一位数（口算、笔算、估算）
- 复式统计表
- 乘法：两位数乘两位数
- 面积：面积单位、正方形和长方形面积、面积单位间的进率
- 年、月、日：24时计时法
- 认识小数：简单小数、小数大小比较、简单小数加减法
- 数学广角：搭配问题`,

  '四年级上册': `- 大数认识：亿以内数、数的产生和十进制计数法、亿以上数
- 公顷和平方千米
- 角的度量：线段、直线、射线、角的度量、角的分类、画角
- 三位数乘两位数、积的变化规律
- 平行四边形和梯形：平行与垂直、平行四边形和梯形的认识
- 除数是两位数的除法：口算、笔算、商的变化规律
- 条形统计图
- 数学广角：优化问题（沏茶、烙饼）`,

  '四年级下册': `- 四则运算：加减法的意义和关系、乘除法的意义和关系、有括号的四则运算
- 观察物体（二）：从不同方向观察物体
- 运算定律：加法运算定律、乘法运算定律、简便计算
- 小数：小数意义、性质、读法写法、大小比较、小数点移动、近似数
- 三角形：特性、分类、内角和
- 小数加减法、小数加减混合运算
- 平均数与复式条形统计图
- 图形的运动：轴对称、平移
- 数学广角：鸡兔同笼问题`,

  '五年级上册': `- 小数乘法：小数乘整数、小数乘小数、积的近似值
- 用数对表示位置
- 小数除法：除数是整数、除数是小数、商的近似值、循环小数
- 可能性：可能性的大小、可能性的计算
- 方程：用字母表示数、方程的意义、解方程、列方程解决问题
- 多边形面积：平行四边形、三角形、梯形、组合图形的面积
- 数学广角：植树问题`,

  '五年级下册': `- 观察物体（三）：根据视图还原立体图形
- 因数与倍数：2、3、5的倍数特征、质数和合数、最大公因数、最小公倍数
- 长方体和正方体：认识、表面积、体积、容积
- 分数：分数的意义、分数与除法的关系、真分数和假分数、分数的基本性质、约分、通分
- 图形的运动：旋转
- 分数的加法和减法：同分母、异分母、分数加减混合运算
- 统计：折线统计图、复式折线统计图
- 数学广角：找次品问题`,

  '六年级上册': `- 分数乘法、分数除法、分数混合运算
- 位置与方向（二）：用方向和距离确定位置
- 比：比的意义、基本性质、比的应用
- 圆：圆的认识、周长、面积、扇形
- 百分数：百分数的认识、百分数和分数小数互化、百分数的简单应用
- 扇形统计图
- 数学广角：数与形`,

  '六年级下册': `- 负数：负数的认识、在数轴上表示正数0和负数
- 百分数（二）：折扣、成数、税率、利率
- 圆柱与圆锥：圆柱的认识、表面积、体积、圆锥的认识、体积
- 比例：比例的意义和基本性质、解比例、正比例、反比例
- 比例尺、图形的放大与缩小、用比例解决问题
- 统计：扇形统计图
- 数学广角：鸽巢问题
- 整理和复习：数与代数、图形与几何、统计与概率`
};

// Build SYSTEM_PROMPT dynamically based on semester
function buildSystemPrompt(semester) {
  const scope = GRADE_SCOPES[semester];
  const scopeSection = scope
    ? `\n【本次出题范围 - ${semester}】\n${scope}`
    : '';

  return SYSTEM_PROMPT_BASE + scopeSection + `

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
- answerFormat：纯数字用number，分数用fraction，其他用text
- 【所有题目都是选择题】无论answerFormat是什么，都必须生成options数组
- options包含2-4个选项（含正确答案），随机排列，单选
- 干扰选项必须合理、有迷惑性，但不能与正确答案相同
- chartData：不需要图表时设为null，需要图表时按指定格式输出
- chartData中的dimensions字段只传纯数字，不带单位（如8而非"8cm"）
- chartData中不要传labels字段，图表标注由前端自动生成

【禁止出现的内容 - 绝对禁止】

- 二年级及以上禁止出现：方程、设未知数x
- 三年级及以上禁止出现：小数乘法、小数除法
- 全部年级禁止出现：负数、比例、百分数（除非题目明确要求）
- 全部年级禁止出现：分数加减乘除混合运算（五年级下册除外）
- 全部年级禁止出现：根号运算、开方
- 全部年级禁止出现：幂运算、指数
- 应用题禁止出现：价格计��（除非是简单的人民币认识）
- 全部年级禁止出现：需要单位换算的应用题（除非是简单的人民币）`;

// 知识点 → chartType 映射
const KNOWLEDGE_CHART_MAP = {
  // 统计与概率
  '条形统计图': 'bar', '复式条形统计图': 'bar',
  '数据分类': 'bar', '简单分类': 'bar',
  '数据收集整理': 'bar', '简单的统计': 'bar',
  '平均数': 'bar',
  '折线统计图': 'line', '复式折线统计图': 'line',
  '扇形统计图': 'pie',
  '复式统计表': 'table',
  // 钟表
  '认识钟表': 'clock', '认识整时': 'clock',
  '认识时间': 'clock', '认识几时几分': 'clock',
  '秒的认识': 'clock', '24时计时法': 'clock',
  // 平面几何
  '认识平面图形': 'shape_2d', '图形的拼组': 'shape_2d',
  '认识线段': 'shape_2d', '认识角': 'shape_2d', '直角的认识': 'shape_2d',
  '四边形的认识': 'shape_2d', '长方形和正方形的认识': 'shape_2d',
  '周长的认识': 'shape_2d', '长方形和正方形的周长': 'shape_2d',
  '面积和面积单位': 'shape_2d', '长方形和正方形的面积': 'shape_2d',
  '线段、直线、射线': 'shape_2d', '角的度量': 'shape_2d',
  '角的分类': 'shape_2d', '画角': 'shape_2d',
  '平行与垂直': 'shape_2d', '平行四边形和梯形的认识': 'shape_2d',
  '三角形的特性': 'shape_2d', '三角形的分类': 'shape_2d', '三角形内角和': 'shape_2d',
  '平行四边形的面积': 'shape_2d', '三角形的面积': 'shape_2d',
  '梯形的面积': 'shape_2d', '组合图形的面积': 'shape_2d',
  '圆的认识': 'shape_2d', '圆的周长': 'shape_2d', '圆的面积': 'shape_2d', '扇形': 'shape_2d',
  // 立体几何
  '认识立体图形': 'shape_3d', '观察物体': 'shape_3d',
  '从不同方向观察物体': 'shape_3d', '根据视图还原立体图形': 'shape_3d',
  '长方体和正方体的认识': 'shape_3d', '长方体和正方体的表面积': 'shape_3d',
  '长方体和正方体的体积': 'shape_3d',
  '圆柱的认识': 'shape_3d', '圆柱的表面积': 'shape_3d', '圆柱的体积': 'shape_3d',
  '圆锥的认识': 'shape_3d', '圆锥的体积': 'shape_3d',
  // 数轴
  '认识小数': 'numberLine', '小数的意义': 'numberLine',
  '负数的认识': 'numberLine', '在直线上表示正数、0和负数': 'numberLine',
  // 分数条
  '分数的初步认识': 'fractionBar', '分数的简单计算': 'fractionBar',
  '分数的意义': 'fractionBar',
  // 找规律（图形/数字序列）
  '图形规律': 'shape_2d', '数字规律': 'shape_2d', '找规律': 'shape_2d',
  // 网格坐标
  '用数对表示位置': 'grid', '比例尺': 'grid',
  // 方位图
  '认识东南西北': 'direction', '认识东北、东南、西北、西南': 'direction',
  '用方向和距离确定位置': 'direction',
  // 图形运动
  '轴对称图形': 'transform', '轴对称': 'transform',
  '平移': 'transform', '旋转': 'transform', '图形的放大与缩小': 'transform',
  // 概率
  '可能性的大小': 'probability', '可能性的计算': 'probability',
  // 测量
  '认识厘米和米': 'measure', '毫米、分米的认识': 'measure',
  '千米的认识': 'measure', '认识克和千克': 'measure',
};

const findChartType = (knowledgeName) => {
  const kn = knowledgeName || '';
  for (const [keyword, chartType] of Object.entries(KNOWLEDGE_CHART_MAP)) {
    if (kn.includes(keyword)) return chartType;
  }
  return null;
};

// chartType 对应的 prompt 模板
const CHART_PROMPT_TEMPLATES = {
  bar: `"chartData": {"chartType":"bar","data":{"title":"图表标题","xAxis":["标签1","标签2","标签3"],"yAxisLabel":"人数","series":[{"name":"人数","data":[12,8,10]}]}}
数据要合理，条数3-6个，数值为正整数。yAxisLabel填写纵轴单位名称。`,

  line: `"chartData": {"chartType":"line","data":{"title":"图表标题","xAxis":["1月","2月","3月","4月"],"yAxisLabel":"温度/℃","series":[{"name":"温度","data":[20,35,28,40]}]}}
数据点4-6个，展示变化趋势。yAxisLabel填写纵轴单位名称。`,

  pie: `"chartData": {"chartType":"pie","data":{"title":"图表标题","items":[{"label":"篮球","value":30},{"label":"足球","value":25},{"label":"跳绳","value":45}]}}
项目3-5个，value为正整数，总和不要求为100。label为类别名称。`,

  clock: `"chartData": {"chartType":"clock","data":{"hour":3,"minute":30}}
hour为1-12整数，minute为0-59整数。题目围绕认识时间展开。
【重要】每道题必须使用不同的时间，变化hour和minute，不要重复同一个时间。题型要多样：有认读时间的、有比较时间先后的、有计算经过时间的。`,

  table: `"chartData": {"chartType":"table","data":{"title":"统计表标题","headers":["项目","数量"],"rows":[["苹果",12],["香蕉",8]]}}
表格2-4列，2-5行数据。`,

  shape_2d: `"chartData": {"chartType":"shape_2d","data":{"shape":"rectangle","dimensions":{"length":8,"width":5}}}
shape可选：rectangle/square/circle/triangle/parallelogram/trapezoid/sector。
dimensions只传纯数字（不带单位），对应字段：
- rectangle: length, width
- square: side
- circle: radius
- triangle: base, height
- parallelogram: base, height
- trapezoid: top, base, height
- sector: radius, angle
【重要】不要传labels字段，图表标注由系统自动生成。
【组合图形】如果题目是组合图形（多个图形拼接），不要用shape字段，改用低层shapes数组格式：
"chartData": {"chartType":"shape_2d","data":{"width":200,"height":120,"shapes":[{"type":"polygon","points":[[20,20],[100,20],[100,100],[20,100]],"stroke":"#333"},{"type":"polygon","points":[[100,40],[180,40],[180,100],[100,100]],"stroke":"#333"}],"labels":[{"text":"4","position":[60,110],"fontSize":12},{"text":"6","position":[140,110],"fontSize":12}]}}
组合图形的shapes中每个polygon代表一个子图形，确保它们相邻拼接。`,

  shape_3d: `"chartData": {"chartType":"shape_3d","data":{"shape":"cuboid","dimensions":{"length":8,"width":5,"height":4},"viewType":"3d"}}
shape可选：cuboid/cube/cylinder/cone/sphere。viewType可选"3d"/"net"/"orthographic"。
dimensions只传纯数字（不带单位），对应字段：
- cuboid: length, width, height
- cube: side
- cylinder: radius, height
- cone: radius, height
- sphere: radius
【重要】不要传labels字段，图表标注由系统自动生成。`,

  numberLine: `"chartData": {"chartType":"numberLine","data":{"start":0,"end":10,"step":1,"highlightPoints":[3,7],"labels":[{"position":3,"text":"A","above":true}]}}
数轴范围合理，step为正数，highlightPoints标记关键点。labels中text为标签文字（如字母、分数），position为数轴上的数值位置。`,

  fractionBar: `"chartData": {"chartType":"fractionBar","data":{"numerator":3,"denominator":4}}
用分数条展示分数，numerator和denominator为纯数字，numerator<=denominator。`,

  countingBlocks: `"chartData": {"chartType":"countingBlocks","data":{"count":7,"rows":2,"cols":5}}
用计数块展示数量，count为实心圆点个数，rows/cols定义网格行列。count不超过rows*cols。`,

  grid: `"chartData": {"chartType":"grid","data":{"gridSize":[7,7],"points":[{"coordinate":[3,5],"label":"小明"},{"coordinate":[5,6],"label":"新位置"}],"showAxes":true}}
gridSize为[列数,行数]，coordinate为[列,行]从0开始。showAxes为true显示坐标轴和数字。points的label为标注文字。`,

  direction: `"chartData": {"chartType":"direction","data":{"center":"学校","points":[{"direction":"北","distance":200,"landmark":"医院"},{"direction":"东偏南30°","distance":300,"landmark":"超市"}]}}
center为中心点名称。direction用"北""东""东偏南30°"等格式。distance为纯数字（单位米）。`,

  transform: `"chartData": {"chartType":"transform","data":{"type":"reflect","gridSize":[8,6],"original":{"points":[[1,1],[3,1],[2,3]]},"transformed":{"points":[[5,1],[7,1],[6,3]]},"axis":{"type":"custom","points":[[4,0],[4,6]]}}}
type可选translate/rotate/reflect/scale。original和transformed为变换前后图形顶点的网格坐标（纯数字）。axis为对称轴（reflect时必须提供）。`,

  probability: `"chartData": {"chartType":"probability","data":{"type":"spinner","items":[{"label":"红色","probability":0.5},{"label":"蓝色","probability":0.25},{"label":"黄色","probability":0.25}]}}
type用"spinner"（转盘）。items的probability之和必须为1，值为小数。label为区域名称。`,

  measure: `"chartData": {"chartType":"measure","data":{"type":"ruler","value":5.5,"unit":"cm","showMarkings":true}}
type用"ruler"。value为纯数字测量值，unit为单位字符串（"cm"/"m"/"mm"/"dm"/"kg"/"g"）。`,
};

const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType, existingSummaries, prefetchHint, semester, unitName, unit } = params;
  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题', geometry: '几何题' };

  const chartType = findChartType(knowledgeName);

  // Determine if chartData is required or optional for this knowledge point
  // Only pure recognition/identification topics can skip chartData
  const kn = knowledgeName || '';
  const un = (params.unitName || '') + kn;
  // These specific topics are pure concept/text questions, chart optional
  const conceptPatterns = [
    '认识平面图形', '认识立体图形', '图形的拼组',
    '位置', '左右', '上下', '前后',
    '分类', '简单分类',
    '比多少', '比大小', '第几'
  ];
  const isConceptTopic = conceptPatterns.some(p => un.includes(p));
  const chartRequired = chartType && !isConceptTopic;
  const chartOptional = chartType && isConceptTopic;

  // Build context line: e.g. "一年级下册 第5单元「认识人民币」中的「简单的计算」"
  let contextLine = grade;
  if (semester) contextLine = semester;
  if (unit && unitName) contextLine += ` 第${unit}单元「${unitName}」中的`;

  let text = `生成${count}道${contextLine}「${knowledgeName}」${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。
严格限制在${semester || grade}知识范围内，题目内容必须与「${unitName || knowledgeName}」单元主题相关，不得超纲。

输出JSON格式：
{"questions":[{
  "id": 1,
  "type": "${typeMap[questionType] || '计算题'}",
  "contentBlocks": [{"type":"text","value":"题目完整文字"}],
  "chartData": ${chartRequired ? '{}（按下面格式）' : 'null（如需图表可按下面格式提供，也可以为null用纯文字出题）'},
  "answer": "答案",
  "answerFormat": "number",
  "answerUnit": "",
  "options": ["答案","干扰项1","干扰项2","干扰项3"],
  "solutionBlocks": [{"type":"text","value":"解题步骤"}],
  "tip": "易错提示"
}]}

【选项规则 - 所有题目必须遵守】
- 所有题目都是选择题，必须提供options数组（2-4个选项，含正确答案，随机排列）
- answer字段的值必须与options中的某个选项完全一致
- 数字答案示例："answer":"34","options":["34","28","40","32"]
- 分数答案示例："answer":"3/4","options":["3/4","2/3","4/5","1/2"]
- 多值答案示例："answer":"长10米，宽8米","options":["长10米，宽8米","长12米，宽6米","长9米，宽9米"]
- 干扰选项要合理，常见错误类型：计算错误、单位混淆、公式用错`;

  if (chartType && CHART_PROMPT_TEMPLATES[chartType]) {
    if (chartRequired) {
      text += `

【图表要求】本题需要chartData，chartType为"${chartType}"。
输出格式示例：
${CHART_PROMPT_TEMPLATES[chartType]}`;
    } else if (chartOptional) {
      text += `

【图表可选】如果题目需要展示图形，可以提供chartData，chartType为"${chartType}"。
如果纯文字就能表达清楚，chartData设为null即可。
图表格式示例：
${CHART_PROMPT_TEMPLATES[chartType]}`;
    }
  }

  // shape_3d: auto-select viewType based on knowledge point
  if (chartType === 'shape_3d') {
    const kn = knowledgeName || '';
    if (kn.includes('观察物体') || kn.includes('从不同方向') || kn.includes('视图') || kn.includes('根据视图')) {
      text += '\n【viewType要求】本题为观察物体/三视图题，viewType必须用"orthographic"，不要用"3d"。';
    } else if (kn.includes('展开') || kn.includes('表面积')) {
      text += '\n【viewType要求】本题涉及展开图或表面积，viewType建议用"net"（展开图）。';
    }
  }

  // shape_2d: special prompts for specific knowledge types
  if (chartType === 'shape_2d') {
    if (kn.includes('组合图形')) {
      text += '\n【组合图形要求】本题为组合图形，必须用低层shapes数组格式画多个拼接的子图形，不要用shape高层格式。确保子图形相邻共边。';
    } else if (kn.includes('数字规律')) {
      text += `\n【数字规律要求】本题为数字找规律题。
题目必须是纯数字序列，让学生找出规律填下一个数。
用低层shapes数组格式画数字序列（圆形背景+数字标签，最后一个标"?"）：
"chartData":{"chartType":"shape_2d","data":{"width":280,"height":60,"shapes":[
  {"type":"circle","center":[25,25],"radius":20,"stroke":"#333","fill":"#E3F2FD"},
  {"type":"circle","center":[75,25],"radius":20,"stroke":"#333","fill":"#E3F2FD"},
  {"type":"circle","center":[125,25],"radius":20,"stroke":"#333","fill":"#E3F2FD"},
  {"type":"circle","center":[175,25],"radius":20,"stroke":"#333","fill":"#E3F2FD"},
  {"type":"circle","center":[225,25],"radius":20,"stroke":"#999"}
],"labels":[
  {"text":"2","position":[25,25],"fontSize":14},
  {"text":"4","position":[75,25],"fontSize":14},
  {"text":"6","position":[125,25],"fontSize":14},
  {"text":"8","position":[175,25],"fontSize":14},
  {"text":"?","position":[225,25],"fontSize":14,"color":"#E74C3C"}
]}}
数字规律类型举例：等差（2,4,6,8）、加倍（1,2,4,8）、递增差（1,2,4,7,11）等。
labels中的text必须是数字（最后一个是"?"），不能是图形名称。`;
    } else if (kn.includes('图形规律') || kn.includes('找规律')) {
      text += `\n【图形规律要求】本题为图形找规律题。
用低层shapes数组格式画图形序列（横向排列重复图案，最后一个用虚线表示待填）：
"chartData":{"chartType":"shape_2d","data":{"width":280,"height":60,"shapes":[
  {"type":"polygon","points":[[10,10],[30,10],[30,40],[10,40]],"stroke":"#333","fill":"#5B9BD5"},
  {"type":"circle","center":[50,25],"radius":15,"stroke":"#333","fill":"#ED7D31"},
  {"type":"polygon","points":[[70,10],[90,10],[90,40],[70,40]],"stroke":"#333","fill":"#5B9BD5"},
  {"type":"circle","center":[110,25],"radius":15,"stroke":"#333","fill":"#ED7D31"},
  {"type":"polygon","points":[[130,10],[150,10],[150,40],[130,40]],"stroke":"#333","fill":"#5B9BD5"},
  {"type":"circle","center":[170,25],"radius":15,"stroke":"#999"}
],"labels":[{"text":"?","position":[170,25],"fontSize":14,"color":"#E74C3C"}]}}
必须用shapes数组格式，不要用shape高层格式。`;
    } else if (isConceptTopic) {
      text += `\n【概念认识题要求】本题为图形概念/认识题，适合低年级学生。
可以不提供chartData（设为null），用纯文字出选择题即可。
题目类型举例：辨认图形名称、数图形个数、判断图形特征、找出不同类的图形、图形拼组方式。
选项必须用中文，如"三角形""正方形""圆形""长方形"等。
不要出需要计算的题，专注于图形的认识和辨别。`;
    }
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
const VALID_CHART_TYPES = [
  'bar', 'line', 'pie', 'clock', 'table',
  'shape_2d', 'shape_3d',
  'numberLine', 'fractionBar', 'countingBlocks',
  'grid', 'direction', 'transform', 'probability', 'measure'
];

const validateContentBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  return blocks.every(b => VALID_BLOCK_TYPES.includes(b.type) && typeof b.value === 'string' && b.value.length > 0);
};

const validateChartData = (cd) => {
  if (!cd) return true; // null is valid (no chart)
  if (!cd.chartType || !VALID_CHART_TYPES.includes(cd.chartType)) return false;
  if (!cd.data || typeof cd.data !== 'object') return false;
  // Type-specific basic validation
  switch (cd.chartType) {
    case 'bar':
      return Array.isArray(cd.data.xAxis) && Array.isArray(cd.data.series);
    case 'line':
      return Array.isArray(cd.data.xAxis) && Array.isArray(cd.data.series);
    case 'pie':
      return Array.isArray(cd.data.items) && cd.data.items.length > 0;
    case 'clock':
      return typeof cd.data.hour === 'number';
    case 'table':
      return Array.isArray(cd.data.headers) && Array.isArray(cd.data.rows);
    case 'shape_2d':
      return (cd.data.shape || (Array.isArray(cd.data.shapes) && cd.data.shapes.length > 0));
    case 'shape_3d':
      return (cd.data.shape || (Array.isArray(cd.data.shapes) && cd.data.shapes.length > 0));
    case 'numberLine':
      return typeof cd.data.start === 'number' && typeof cd.data.end === 'number';
    case 'fractionBar':
      return typeof cd.data.denominator === 'number' && cd.data.denominator > 0;
    default:
      return true;
  }
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
  if (!validateChartData(q.chartData)) return false;
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

      // Extract chartData (new unified field)
      let chartData = q.chartData || null;
      if (chartData && !validateChartData(chartData)) {
        console.warn('[parseResponse] chartData无效，已忽略:', JSON.stringify(chartData).slice(0, 80));
        chartData = null;
      }

      // Legacy fallback: convert old diagram/numberLine fields if present
      if (!chartData && q.diagram) {
        const d = q.diagram;
        if (d.type === 'geometry' && d.shapes) {
          const has3d = d.shapes.some(s => ['cuboid', 'cube', 'cylinder', 'cone', 'sphere'].includes(s.type));
          chartData = { chartType: has3d ? 'shape_3d' : 'shape_2d', data: d };
        } else if (d.type === 'fractionBar') {
          chartData = { chartType: 'fractionBar', data: { numerator: d.numerator, denominator: d.denominator } };
        } else if (d.type === 'countingBlocks') {
          chartData = { chartType: 'countingBlocks', data: { count: d.count, rows: d.rows, cols: d.cols } };
        }
      }
      if (!chartData && q.numberLine) {
        if (typeof q.numberLine.start === 'number' && typeof q.numberLine.end === 'number') {
          chartData = { chartType: 'numberLine', data: q.numberLine };
        }
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
        chartData: chartData,
        answer: String(q.answer || '').trim(),
        answerFormat: q.answerFormat || 'number',
        answerUnit: q.answerUnit || '',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : null,
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
      // Verify answer: check if solution text contains arithmetic that contradicts the answer
      if (q.answerFormat === 'number') {
        const answerNum = parseFloat(q.answer);
        if (!isNaN(answerNum)) {
          const solText = (q.solutionBlocks || []).map(b => b.value || '').join('');
          // Find patterns like "= X + Y = Z" and verify Z = X + Y
          const calcPatterns = solText.match(/(\d+\.?\d*)\s*[+\-×÷*\/]\s*(\d+\.?\d*)\s*=\s*(\d+\.?\d*)/g);
          if (calcPatterns) {
            for (const p of calcPatterns) {
              const m = p.match(/(\d+\.?\d*)\s*([+\-×÷*\/])\s*(\d+\.?\d*)\s*=\s*(\d+\.?\d*)/);
              if (m) {
                const a = parseFloat(m[1]), op = m[2], b = parseFloat(m[3]), c = parseFloat(m[4]);
                let expected;
                if (op === '+') expected = a + b;
                else if (op === '-' || op === '－') expected = a - b;
                else if (op === '×' || op === '*') expected = a * b;
                else if (op === '÷' || op === '/') expected = b !== 0 ? a / b : null;
                if (expected !== null && Math.abs(expected - c) > 0.01) {
                  console.warn('[parseResponse] 计算错误，丢弃:', q.id, p, '期望', expected, '实际', c);
                  return false;
                }
              }
            }
          }
        }
      }
      return true;
    });
};

const extractTextFromBlocks = (blocks) => {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(b => b.value || '').join('');
};

const normContent = (s) => String(s || '').replace(/\s/g, '').replace(/\d+\.?\d*/g, 'N');

const isDuplicate = (question, existingList) => {
  if (!question || !existingList || !existingList.length) return false;
  const n = normContent(extractTextFromBlocks(question.contentBlocks));
  return existingList.some((ex) => normContent(ex) === n);
};

// ========== 调用大模型 ==========
const callModel = async (client, modelName, userPrompt, maxTokens, requestId, systemPrompt) => {
  console.log('[callModel]', JSON.stringify({ requestId, model: modelName, promptLen: userPrompt.length, sysLen: systemPrompt.length, maxTokens }));

  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
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
    const semester = String(event.semester || '').slice(0, 20);
    const unitName = String(event.unitName || '').slice(0, 30);
    const unit = parseInt(event.unit, 10) || 0;
    const { count, difficulty, questionType, sanitizedExistingQuestions } = securityData;
    const prefetchHint = String(event.prefetchHint || '').slice(0, 80);
    const maxTokens = count === 1 ? 800 : 2000;
    const systemPrompt = buildSystemPrompt(semester || grade || '');

    const userPrompt = buildUserPrompt({
      knowledgeName,
      grade: grade || '五年级',
      semester,
      unitName,
      unit,
      count,
      difficulty,
      questionType,
      existingSummaries: sanitizedExistingQuestions,
      prefetchHint: prefetchHint || undefined
    });

    let completion = await callModel(client, modelName, userPrompt, maxTokens, requestId, systemPrompt);
    let content = completion.choices?.[0]?.message?.content;
    let questions = parseResponse(content);
    let duplicateWarning = false;

    if (questions.length > 0 && isDuplicate(questions[0], sanitizedExistingQuestions)) {
      const retryPrompt = `${userPrompt}\n必须与已列题目完全不同，不得重复。`;
      completion = await callModel(client, modelName, retryPrompt, maxTokens, `${requestId}_dedup`, systemPrompt);
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
