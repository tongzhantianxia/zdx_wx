/**
 * 小学数学知识点数据库
 * 按照人教版1-6年级上下册目录整理
 */

const knowledgeData = {

  // ==================== 一年级 ====================
  'grade1-upper': {
    semester: '一年级上册',
    chapters: [
      {
        id: 'g1u-1',
        unit: 1,
        name: '准备课',
        knowledges: [
          { id: 'g1u-1-1', unit: 1, name: '数一数', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-1-2', unit: 1, name: '比多少', semester: '一年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g1u-2',
        unit: 2,
        name: '位置',
        knowledges: [
          { id: 'g1u-2-1', unit: 2, name: '上下前后', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-2-2', unit: 2, name: '左右', semester: '一年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g1u-3',
        unit: 3,
        name: '1-5的认识和加减法',
        knowledges: [
          { id: 'g1u-3-1', unit: 3, name: '1-5的认识', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-3-2', unit: 3, name: '比大小', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-3-3', unit: 3, name: '第几', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-3-4', unit: 3, name: '分与合', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-3-5', unit: 3, name: '加法', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-3-6', unit: 3, name: '减法', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-3-7', unit: 3, name: '0的认识', semester: '一年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g1u-4',
        unit: 4,
        name: '认识图形（一）',
        knowledges: [
          { id: 'g1u-4-1', unit: 4, name: '认识立体图形', semester: '一年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g1u-5',
        unit: 5,
        name: '6-10的认识和加减法',
        knowledges: [
          { id: 'g1u-5-1', unit: 5, name: '6和7的认识', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-5-2', unit: 5, name: '6和7的加减法', semester: '一年级上册', difficulty_range: [1, 2] },
          { id: 'g1u-5-3', unit: 5, name: '8和9的认识', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-5-4', unit: 5, name: '8和9的加减法', semester: '一年级上册', difficulty_range: [1, 2] },
          { id: 'g1u-5-5', unit: 5, name: '10的认识', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-5-6', unit: 5, name: '10的加减法', semester: '一年级上册', difficulty_range: [1, 2] },
          { id: 'g1u-5-7', unit: 5, name: '连加连减', semester: '一年级上册', difficulty_range: [1, 2] },
          { id: 'g1u-5-8', unit: 5, name: '加减混合', semester: '一年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1u-6',
        unit: 6,
        name: '11-20各数的认识',
        knowledges: [
          { id: 'g1u-6-1', unit: 6, name: '11-20各数的认识', semester: '一年级上册', difficulty_range: [1, 1] },
          { id: 'g1u-6-2', unit: 6, name: '十加几和相应的减法', semester: '一年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1u-7',
        unit: 7,
        name: '认识钟表',
        knowledges: [
          { id: 'g1u-7-1', unit: 7, name: '认识整时', semester: '一年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g1u-8',
        unit: 8,
        name: '20以内的进位加法',
        knowledges: [
          { id: 'g1u-8-1', unit: 8, name: '9加几', semester: '一年级上册', difficulty_range: [1, 2] },
          { id: 'g1u-8-2', unit: 8, name: '8、7、6加几', semester: '一年级上册', difficulty_range: [1, 2] },
          { id: 'g1u-8-3', unit: 8, name: '5、4、3、2加几', semester: '一年级上册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  'grade1-lower': {
    semester: '一年级下册',
    chapters: [
      {
        id: 'g1l-1',
        unit: 1,
        name: '认识图形（二）',
        knowledges: [
          { id: 'g1l-1-1', unit: 1, name: '认识平面图形', semester: '一年级下册', difficulty_range: [1, 1] },
          { id: 'g1l-1-2', unit: 1, name: '图形的拼组', semester: '一年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1l-2',
        unit: 2,
        name: '20以内的退位减法',
        knowledges: [
          { id: 'g1l-2-1', unit: 2, name: '十几减9', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-2-2', unit: 2, name: '十几减8、7、6', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-2-3', unit: 2, name: '十几减5、4、3、2', semester: '一年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1l-3',
        unit: 3,
        name: '分类与整理',
        knowledges: [
          { id: 'g1l-3-1', unit: 3, name: '简单分类', semester: '一年级下册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g1l-4',
        unit: 4,
        name: '100以内数的认识',
        knowledges: [
          { id: 'g1l-4-1', unit: 4, name: '数数', semester: '一年级下册', difficulty_range: [1, 1] },
          { id: 'g1l-4-2', unit: 4, name: '数的组成', semester: '一年级下册', difficulty_range: [1, 1] },
          { id: 'g1l-4-3', unit: 4, name: '读数写数', semester: '一年级下册', difficulty_range: [1, 1] },
          { id: 'g1l-4-4', unit: 4, name: '数的顺序', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-4-5', unit: 4, name: '比较大小', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-4-6', unit: 4, name: '整十数加一位数', semester: '一年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1l-5',
        unit: 5,
        name: '认识人民币',
        knowledges: [
          { id: 'g1l-5-1', unit: 5, name: '认识人民币', semester: '一年级下册', difficulty_range: [1, 1] },
          { id: 'g1l-5-2', unit: 5, name: '简单的计算', semester: '一年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1l-6',
        unit: 6,
        name: '100以内的加法和减法（一）',
        knowledges: [
          { id: 'g1l-6-1', unit: 6, name: '整十数加减整十数', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-6-2', unit: 6, name: '两位数加一位数', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-6-3', unit: 6, name: '两位数减一位数', semester: '一年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g1l-7',
        unit: 7,
        name: '找规律',
        knowledges: [
          { id: 'g1l-7-1', unit: 7, name: '图形规律', semester: '一年级下册', difficulty_range: [1, 2] },
          { id: 'g1l-7-2', unit: 7, name: '数字规律', semester: '一年级下册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  // ==================== 二年级 ====================
  'grade2-upper': {
    semester: '二年级上册',
    chapters: [
      {
        id: 'g2u-1',
        unit: 1,
        name: '长度单位',
        knowledges: [
          { id: 'g2u-1-1', unit: 1, name: '认识厘米和米', semester: '二年级上册', difficulty_range: [1, 1] },
          { id: 'g2u-1-2', unit: 1, name: '认识线段', semester: '二年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g2u-2',
        unit: 2,
        name: '100以内的加法和减法（二）',
        knowledges: [
          { id: 'g2u-2-1', unit: 2, name: '两位数加两位数', semester: '二年级上册', difficulty_range: [1, 2] },
          { id: 'g2u-2-2', unit: 2, name: '两位数减两位数', semester: '二年级上册', difficulty_range: [1, 2] },
          { id: 'g2u-2-3', unit: 2, name: '连加连减', semester: '二年级上册', difficulty_range: [1, 2] },
          { id: 'g2u-2-4', unit: 2, name: '加减混合', semester: '二年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2u-3',
        unit: 3,
        name: '角的初步认识',
        knowledges: [
          { id: 'g2u-3-1', unit: 3, name: '认识角', semester: '二年级上册', difficulty_range: [1, 1] },
          { id: 'g2u-3-2', unit: 3, name: '直角的认识', semester: '二年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g2u-4',
        unit: 4,
        name: '表内乘法（一）',
        knowledges: [
          { id: 'g2u-4-1', unit: 4, name: '乘法的初步认识', semester: '二年级上册', difficulty_range: [1, 1] },
          { id: 'g2u-4-2', unit: 4, name: '2-6的乘法口诀', semester: '二年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2u-5',
        unit: 5,
        name: '观察物体（一）',
        knowledges: [
          { id: 'g2u-5-1', unit: 5, name: '观察物体', semester: '二年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g2u-6',
        unit: 6,
        name: '表内乘法（二）',
        knowledges: [
          { id: 'g2u-6-1', unit: 6, name: '7的乘法口诀', semester: '二年级上册', difficulty_range: [1, 2] },
          { id: 'g2u-6-2', unit: 6, name: '8的乘法口诀', semester: '二年级上册', difficulty_range: [1, 2] },
          { id: 'g2u-6-3', unit: 6, name: '9的乘法口诀', semester: '二年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2u-7',
        unit: 7,
        name: '认识时间',
        knowledges: [
          { id: 'g2u-7-1', unit: 7, name: '认识几时几分', semester: '二年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2u-8',
        unit: 8,
        name: '数学广角——搭配',
        knowledges: [
          { id: 'g2u-8-1', unit: 8, name: '简单的排列组合', semester: '二年级上册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  'grade2-lower': {
    semester: '二年级下册',
    chapters: [
      {
        id: 'g2l-1',
        unit: 1,
        name: '数据收集整理',
        knowledges: [
          { id: 'g2l-1-1', unit: 1, name: '简单的统计', semester: '二年级下册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g2l-2',
        unit: 2,
        name: '表内除法（一）',
        knowledges: [
          { id: 'g2l-2-1', unit: 2, name: '除法的初步认识', semester: '二年级下册', difficulty_range: [1, 1] },
          { id: 'g2l-2-2', unit: 2, name: '用2-6的乘法口诀求商', semester: '二年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2l-3',
        unit: 3,
        name: '图形的运动（一）',
        knowledges: [
          { id: 'g2l-3-1', unit: 3, name: '轴对称图形', semester: '二年级下册', difficulty_range: [1, 1] },
          { id: 'g2l-3-2', unit: 3, name: '平移', semester: '二年级下册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g2l-4',
        unit: 4,
        name: '表内除法（二）',
        knowledges: [
          { id: 'g2l-4-1', unit: 4, name: '用7-9的乘法口诀求商', semester: '二年级下册', difficulty_range: [1, 2] },
          { id: 'g2l-4-2', unit: 4, name: '解决问题', semester: '二年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2l-5',
        unit: 5,
        name: '混合运算',
        knowledges: [
          { id: 'g2l-5-1', unit: 5, name: '没有括号的混合运算', semester: '二年级下册', difficulty_range: [1, 2] },
          { id: 'g2l-5-2', unit: 5, name: '有括号的混合运算', semester: '二年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2l-6',
        unit: 6,
        name: '有余数的除法',
        knowledges: [
          { id: 'g2l-6-1', unit: 6, name: '有余数的除法', semester: '二年级下册', difficulty_range: [1, 2] },
          { id: 'g2l-6-2', unit: 6, name: '解决问题', semester: '二年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2l-7',
        unit: 7,
        name: '万以内数的认识',
        knowledges: [
          { id: 'g2l-7-1', unit: 7, name: '1000以内数的认识', semester: '二年级下册', difficulty_range: [1, 1] },
          { id: 'g2l-7-2', unit: 7, name: '10000以内数的认识', semester: '二年级下册', difficulty_range: [1, 1] },
          { id: 'g2l-7-3', unit: 7, name: '整百整千数加减法', semester: '二年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g2l-8',
        unit: 8,
        name: '克和千克',
        knowledges: [
          { id: 'g2l-8-1', unit: 8, name: '认识克和千克', semester: '二年级下册', difficulty_range: [1, 1] }
        ]
      }
    ]
  },

  // ==================== 三年级 ====================
  'grade3-upper': {
    semester: '三年级上册',
    chapters: [
      {
        id: 'g3u-1',
        unit: 1,
        name: '时、分、秒',
        knowledges: [
          { id: 'g3u-1-1', unit: 1, name: '秒的认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-1-2', unit: 1, name: '时间的计算', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3u-2',
        unit: 2,
        name: '万以内的加法和减法（一）',
        knowledges: [
          { id: 'g3u-2-1', unit: 2, name: '两位数加减两位数口算', semester: '三年级上册', difficulty_range: [1, 2] },
          { id: 'g3u-2-2', unit: 2, name: '几百几十加减几百几十', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3u-3',
        unit: 3,
        name: '测量',
        knowledges: [
          { id: 'g3u-3-1', unit: 3, name: '毫米、分米的认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-3-2', unit: 3, name: '千米的认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-3-3', unit: 3, name: '吨的认识', semester: '三年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g3u-4',
        unit: 4,
        name: '万以内的加法和减法（二）',
        knowledges: [
          { id: 'g3u-4-1', unit: 4, name: '三位数加三位数', semester: '三年级上册', difficulty_range: [1, 2] },
          { id: 'g3u-4-2', unit: 4, name: '三位数减三位数', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3u-5',
        unit: 5,
        name: '倍的认识',
        knowledges: [
          { id: 'g3u-5-1', unit: 5, name: '倍的认识', semester: '三年级上册', difficulty_range: [1, 2] },
          { id: 'g3u-5-2', unit: 5, name: '求一个数是另一个数的几倍', semester: '三年级上册', difficulty_range: [1, 2] },
          { id: 'g3u-5-3', unit: 5, name: '求一个数的几倍是多少', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3u-6',
        unit: 6,
        name: '多位数乘一位数',
        knowledges: [
          { id: 'g3u-6-1', unit: 6, name: '口算乘法', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-6-2', unit: 6, name: '笔算乘法', semester: '三年级上册', difficulty_range: [1, 2] },
          { id: 'g3u-6-3', unit: 6, name: '乘法估算', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3u-7',
        unit: 7,
        name: '长方形和正方形',
        knowledges: [
          { id: 'g3u-7-1', unit: 7, name: '四边形的认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-7-2', unit: 7, name: '长方形和正方形的认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-7-3', unit: 7, name: '周长的认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-7-4', unit: 7, name: '长方形和正方形的周长', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3u-8',
        unit: 8,
        name: '分数的初步认识',
        knowledges: [
          { id: 'g3u-8-1', unit: 8, name: '分数的初步认识', semester: '三年级上册', difficulty_range: [1, 1] },
          { id: 'g3u-8-2', unit: 8, name: '分数的简单计算', semester: '三年级上册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  'grade3-lower': {
    semester: '三年级下册',
    chapters: [
      {
        id: 'g3l-1',
        unit: 1,
        name: '位置与方向（一）',
        knowledges: [
          { id: 'g3l-1-1', unit: 1, name: '认识东南西北', semester: '三年级下册', difficulty_range: [1, 1] },
          { id: 'g3l-1-2', unit: 1, name: '认识东北、东南、西北、西南', semester: '三年级下册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g3l-2',
        unit: 2,
        name: '除数是一位数的除法',
        knowledges: [
          { id: 'g3l-2-1', unit: 2, name: '口算除法', semester: '三年级下册', difficulty_range: [1, 1] },
          { id: 'g3l-2-2', unit: 2, name: '笔算除法', semester: '三年级下册', difficulty_range: [1, 2] },
          { id: 'g3l-2-3', unit: 2, name: '除法估算', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3l-3',
        unit: 3,
        name: '复式统计表',
        knowledges: [
          { id: 'g3l-3-1', unit: 3, name: '复式统计表', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3l-4',
        unit: 4,
        name: '两位数乘两位数',
        knowledges: [
          { id: 'g3l-4-1', unit: 4, name: '口算乘法', semester: '三年级下册', difficulty_range: [1, 1] },
          { id: 'g3l-4-2', unit: 4, name: '笔算乘法', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3l-5',
        unit: 5,
        name: '面积',
        knowledges: [
          { id: 'g3l-5-1', unit: 5, name: '面积和面积单位', semester: '三年级下册', difficulty_range: [1, 1] },
          { id: 'g3l-5-2', unit: 5, name: '长方形和正方形的面积', semester: '三年级下册', difficulty_range: [1, 2] },
          { id: 'g3l-5-3', unit: 5, name: '面积单位间的进率', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3l-6',
        unit: 6,
        name: '年、月、日',
        knowledges: [
          { id: 'g3l-6-1', unit: 6, name: '年、月、日的认识', semester: '三年级下册', difficulty_range: [1, 1] },
          { id: 'g3l-6-2', unit: 6, name: '24时计时法', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3l-7',
        unit: 7,
        name: '小数的初步认识',
        knowledges: [
          { id: 'g3l-7-1', unit: 7, name: '认识小数', semester: '三年级下册', difficulty_range: [1, 1] },
          { id: 'g3l-7-2', unit: 7, name: '小数的大小比较', semester: '三年级下册', difficulty_range: [1, 2] },
          { id: 'g3l-7-3', unit: 7, name: '简单的小数加减法', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g3l-8',
        unit: 8,
        name: '数学广角——搭配（二）',
        knowledges: [
          { id: 'g3l-8-1', unit: 8, name: '稍复杂的排列组合', semester: '三年级下册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  // ==================== 四年级 ====================
  'grade4-upper': {
    semester: '四年级上册',
    chapters: [
      {
        id: 'g4u-1',
        unit: 1,
        name: '大数的认识',
        knowledges: [
          { id: 'g4u-1-1', unit: 1, name: '亿以内数的认识', semester: '四年级上册', difficulty_range: [1, 1] },
          { id: 'g4u-1-2', unit: 1, name: '数的产生和十进制计数法', semester: '四年级上册', difficulty_range: [1, 1] },
          { id: 'g4u-1-3', unit: 1, name: '亿以上数的认识', semester: '四年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g4u-2',
        unit: 2,
        name: '公顷和平方千米',
        knowledges: [
          { id: 'g4u-2-1', unit: 2, name: '公顷的认识', semester: '四年级上册', difficulty_range: [1, 1] },
          { id: 'g4u-2-2', unit: 2, name: '平方千米的认识', semester: '四年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g4u-3',
        unit: 3,
        name: '角的度量',
        knowledges: [
          { id: 'g4u-3-1', unit: 3, name: '线段、直线、射线', semester: '四年级上册', difficulty_range: [1, 1] },
          { id: 'g4u-3-2', unit: 3, name: '角的度量', semester: '四年级上册', difficulty_range: [1, 2] },
          { id: 'g4u-3-3', unit: 3, name: '角的分类', semester: '四年级上册', difficulty_range: [1, 2] },
          { id: 'g4u-3-4', unit: 3, name: '画角', semester: '四年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4u-4',
        unit: 4,
        name: '三位数乘两位数',
        knowledges: [
          { id: 'g4u-4-1', unit: 4, name: '三位数乘两位数', semester: '四年级上册', difficulty_range: [1, 2] },
          { id: 'g4u-4-2', unit: 4, name: '积的变化规律', semester: '四年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4u-5',
        unit: 5,
        name: '平行四边形和梯形',
        knowledges: [
          { id: 'g4u-5-1', unit: 5, name: '平行与垂直', semester: '四年级上册', difficulty_range: [1, 1] },
          { id: 'g4u-5-2', unit: 5, name: '平行四边形和梯形的认识', semester: '四年级上册', difficulty_range: [1, 1] }
        ]
      },
      {
        id: 'g4u-6',
        unit: 6,
        name: '除数是两位数的除法',
        knowledges: [
          { id: 'g4u-6-1', unit: 6, name: '口算除法', semester: '四年级上册', difficulty_range: [1, 1] },
          { id: 'g4u-6-2', unit: 6, name: '笔算除法', semester: '四年级上册', difficulty_range: [1, 2] },
          { id: 'g4u-6-3', unit: 6, name: '商的变化规律', semester: '四年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4u-7',
        unit: 7,
        name: '条形统计图',
        knowledges: [
          { id: 'g4u-7-1', unit: 7, name: '条形统计图', semester: '四年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4u-8',
        unit: 8,
        name: '数学广角——优化',
        knowledges: [
          { id: 'g4u-8-1', unit: 8, name: '沏茶问题', semester: '四年级上册', difficulty_range: [1, 2] },
          { id: 'g4u-8-2', unit: 8, name: '烙饼问题', semester: '四年级上册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  'grade4-lower': {
    semester: '四年级下册',
    chapters: [
      {
        id: 'g4l-1',
        unit: 1,
        name: '四则运算',
        knowledges: [
          { id: 'g4l-1-1', unit: 1, name: '加减法的意义和各部分间的关系', semester: '四年级下册', difficulty_range: [1, 1] },
          { id: 'g4l-1-2', unit: 1, name: '乘除法的意义和各部分间的关系', semester: '四年级下册', difficulty_range: [1, 1] },
          { id: 'g4l-1-3', unit: 1, name: '有括号的四则运算', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-2',
        unit: 2,
        name: '观察物体（二）',
        knowledges: [
          { id: 'g4l-2-1', unit: 2, name: '从不同方向观察物体', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-3',
        unit: 3,
        name: '运算定律',
        knowledges: [
          { id: 'g4l-3-1', unit: 3, name: '加法运算定律', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-3-2', unit: 3, name: '乘法运算定律', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-3-3', unit: 3, name: '简便计算', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-4',
        unit: 4,
        name: '小数的意义和性质',
        knowledges: [
          { id: 'g4l-4-1', unit: 4, name: '小数的意义', semester: '四年级下册', difficulty_range: [1, 1] },
          { id: 'g4l-4-2', unit: 4, name: '小数的读法和写法', semester: '四年级下册', difficulty_range: [1, 1] },
          { id: 'g4l-4-3', unit: 4, name: '小数的性质', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-4-4', unit: 4, name: '小数的大小比较', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-4-5', unit: 4, name: '小数点移动引起小数大小的变化', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-4-6', unit: 4, name: '小数与单位换算', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-4-7', unit: 4, name: '小数的近似数', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-5',
        unit: 5,
        name: '三角形',
        knowledges: [
          { id: 'g4l-5-1', unit: 5, name: '三角形的特性', semester: '四年级下册', difficulty_range: [1, 1] },
          { id: 'g4l-5-2', unit: 5, name: '三角形的分类', semester: '四年级下册', difficulty_range: [1, 1] },
          { id: 'g4l-5-3', unit: 5, name: '三角形内角和', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-6',
        unit: 6,
        name: '小数的加法和减法',
        knowledges: [
          { id: 'g4l-6-1', unit: 6, name: '小数加减法', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-6-2', unit: 6, name: '小数加减混合运算', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-7',
        unit: 7,
        name: '图形的运动（二）',
        knowledges: [
          { id: 'g4l-7-1', unit: 7, name: '轴对称', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-7-2', unit: 7, name: '平移', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g4l-8',
        unit: 8,
        name: '平均数与条形统计图',
        knowledges: [
          { id: 'g4l-8-1', unit: 8, name: '平均数', semester: '四年级下册', difficulty_range: [1, 2] },
          { id: 'g4l-8-2', unit: 8, name: '复式条形统计图', semester: '四年级下册', difficulty_range: [1, 2] }
        ]
      }
    ]
  },

  // ==================== 五年级（已有，保持不变） ====================
  'grade5-upper': {
    semester: '五年级上册',
    chapters: [
      {
        id: 'g5u-1',
        unit: 1,
        name: '小数乘法',
        knowledges: [
          { id: 'g5u-1-1', unit: 1, name: '小数乘整数', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-1-2', unit: 1, name: '小数乘小数', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-1-3', unit: 1, name: '积的近似值', semester: '五年级上册', difficulty_range: [2, 3] },
          { id: 'g5u-1-4', unit: 1, name: '小数乘法运算定律', semester: '五年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5u-2',
        unit: 2,
        name: '位置',
        knowledges: [
          { id: 'g5u-2-1', unit: 2, name: '用数对表示位置', semester: '五年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g5u-3',
        unit: 3,
        name: '小数除法',
        knowledges: [
          { id: 'g5u-3-1', unit: 3, name: '除数是整数的小数除法', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-3-2', unit: 3, name: '除数是小数的小数除法', semester: '五年级上册', difficulty_range: [2, 3] },
          { id: 'g5u-3-3', unit: 3, name: '商的近似值', semester: '五年级上册', difficulty_range: [2, 3] },
          { id: 'g5u-3-4', unit: 3, name: '循环小数', semester: '五年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5u-4',
        unit: 4,
        name: '可能性',
        knowledges: [
          { id: 'g5u-4-1', unit: 4, name: '可能性的大小', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-4-2', unit: 4, name: '可能性的计算', semester: '五年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5u-5',
        unit: 5,
        name: '简易方程',
        knowledges: [
          { id: 'g5u-5-1', unit: 5, name: '用字母表示数', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-5-2', unit: 5, name: '方程的意义', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-5-3', unit: 5, name: '解方程', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-5-4', unit: 5, name: '列方程解决问题', semester: '五年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5u-6',
        unit: 6,
        name: '多边形的面积',
        knowledges: [
          { id: 'g5u-6-1', unit: 6, name: '平行四边形的面积', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-6-2', unit: 6, name: '三角形的面积', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-6-3', unit: 6, name: '梯形的面积', semester: '五年级上册', difficulty_range: [1, 2] },
          { id: 'g5u-6-4', unit: 6, name: '组合图形的面积', semester: '五年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5u-7',
        unit: 7,
        name: '数学广角——植树问题',
        knowledges: [
          { id: 'g5u-7-1', unit: 7, name: '两端都栽的植树问题', semester: '五年级上册', difficulty_range: [2, 3] },
          { id: 'g5u-7-2', unit: 7, name: '两端都不栽的植树问题', semester: '五年级上册', difficulty_range: [2, 3] },
          { id: 'g5u-7-3', unit: 7, name: '环形植树问题', semester: '五年级上册', difficulty_range: [2, 3] }
        ]
      }
    ]
  },

  'grade5-lower': {
    semester: '五年级下册',
    chapters: [
      {
        id: 'g5l-1',
        unit: 1,
        name: '观察物体（三）',
        knowledges: [
          { id: 'g5l-1-1', unit: 1, name: '根据视图还原立体图形', semester: '五年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5l-2',
        unit: 2,
        name: '因数与倍数',
        knowledges: [
          { id: 'g5l-2-1', unit: 2, name: '因数和倍数的认识', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-2-2', unit: 2, name: '2、3、5的倍数特征', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-2-3', unit: 2, name: '质数和合数', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-2-4', unit: 2, name: '分解质因数', semester: '五年级下册', difficulty_range: [2, 3] },
          { id: 'g5l-2-5', unit: 2, name: '最大公因数', semester: '五年级下册', difficulty_range: [2, 3] },
          { id: 'g5l-2-6', unit: 2, name: '最小公倍数', semester: '五年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5l-3',
        unit: 3,
        name: '长方体和正方体',
        knowledges: [
          { id: 'g5l-3-1', unit: 3, name: '长方体和正方体的认识', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-3-2', unit: 3, name: '长方体和正方体的表面积', semester: '五年级下册', difficulty_range: [2, 3] },
          { id: 'g5l-3-3', unit: 3, name: '长方体和正方体的体积', semester: '五年级下册', difficulty_range: [2, 3] },
          { id: 'g5l-3-4', unit: 3, name: '体积单位间的进率', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-3-5', unit: 3, name: '容积和容积单位', semester: '五年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5l-4',
        unit: 4,
        name: '分数的意义和性质',
        knowledges: [
          { id: 'g5l-4-1', unit: 4, name: '分数的意义', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-4-2', unit: 4, name: '分数与除法的关系', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-4-3', unit: 4, name: '真分数和假分数', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-4-4', unit: 4, name: '分数的基本性质', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-4-5', unit: 4, name: '约分', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-4-6', unit: 4, name: '通分', semester: '五年级下册', difficulty_range: [2, 3] },
          { id: 'g5l-4-7', unit: 4, name: '分数和小数的互化', semester: '五年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g5l-5',
        unit: 5,
        name: '分数的加法和减法',
        knowledges: [
          { id: 'g5l-5-1', unit: 5, name: '同分母分数加减法', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-5-2', unit: 5, name: '异分母分数加减法', semester: '五年级下册', difficulty_range: [2, 3] },
          { id: 'g5l-5-3', unit: 5, name: '分数加减混合运算', semester: '五年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5l-6',
        unit: 6,
        name: '统计',
        knowledges: [
          { id: 'g5l-6-1', unit: 6, name: '折线统计图', semester: '五年级下册', difficulty_range: [1, 2] },
          { id: 'g5l-6-2', unit: 6, name: '复式折线统计图', semester: '五年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g5l-7',
        unit: 7,
        name: '数学广角——找次品',
        knowledges: [
          { id: 'g5l-7-1', unit: 7, name: '找次品问题', semester: '五年级下册', difficulty_range: [2, 3] }
        ]
      }
    ]
  },

  // ==================== 六年级 ====================
  'grade6-upper': {
    semester: '六年级上册',
    chapters: [
      {
        id: 'g6u-1',
        unit: 1,
        name: '分数乘法',
        knowledges: [
          { id: 'g6u-1-1', unit: 1, name: '分数乘整数', semester: '六年级上册', difficulty_range: [1, 2] },
          { id: 'g6u-1-2', unit: 1, name: '分数乘分数', semester: '六年级上册', difficulty_range: [1, 2] },
          { id: 'g6u-1-3', unit: 1, name: '分数混合运算', semester: '六年级上册', difficulty_range: [2, 3] },
          { id: 'g6u-1-4', unit: 1, name: '解决问题', semester: '六年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6u-2',
        unit: 2,
        name: '位置与方向（二）',
        knowledges: [
          { id: 'g6u-2-1', unit: 2, name: '用方向和距离确定位置', semester: '六年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g6u-3',
        unit: 3,
        name: '分数除法',
        knowledges: [
          { id: 'g6u-3-1', unit: 3, name: '分数除以整数', semester: '六年级上册', difficulty_range: [1, 2] },
          { id: 'g6u-3-2', unit: 3, name: '一个数除以分数', semester: '六年级上册', difficulty_range: [2, 3] },
          { id: 'g6u-3-3', unit: 3, name: '分数混合运算', semester: '六年级上册', difficulty_range: [2, 3] },
          { id: 'g6u-3-4', unit: 3, name: '解决问题', semester: '六年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6u-4',
        unit: 4,
        name: '比',
        knowledges: [
          { id: 'g6u-4-1', unit: 4, name: '比的意义', semester: '六年级上册', difficulty_range: [1, 1] },
          { id: 'g6u-4-2', unit: 4, name: '比的基本性质', semester: '六年级上册', difficulty_range: [1, 2] },
          { id: 'g6u-4-3', unit: 4, name: '比的应用', semester: '六年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6u-5',
        unit: 5,
        name: '圆',
        knowledges: [
          { id: 'g6u-5-1', unit: 5, name: '圆的认识', semester: '六年级上册', difficulty_range: [1, 1] },
          { id: 'g6u-5-2', unit: 5, name: '圆的周长', semester: '六年级上册', difficulty_range: [1, 2] },
          { id: 'g6u-5-3', unit: 5, name: '圆的面积', semester: '六年级上册', difficulty_range: [2, 3] },
          { id: 'g6u-5-4', unit: 5, name: '扇形', semester: '六年级上册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6u-6',
        unit: 6,
        name: '百分数（一）',
        knowledges: [
          { id: 'g6u-6-1', unit: 6, name: '百分数的认识', semester: '六年级上册', difficulty_range: [1, 1] },
          { id: 'g6u-6-2', unit: 6, name: '百分数和分数、小数的互化', semester: '六年级上册', difficulty_range: [1, 2] },
          { id: 'g6u-6-3', unit: 6, name: '百分数的简单应用', semester: '六年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g6u-7',
        unit: 7,
        name: '扇形统计图',
        knowledges: [
          { id: 'g6u-7-1', unit: 7, name: '扇形统计图', semester: '六年级上册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g6u-8',
        unit: 8,
        name: '数学广角——数与形',
        knowledges: [
          { id: 'g6u-8-1', unit: 8, name: '数与形', semester: '六年级上册', difficulty_range: [2, 3] }
        ]
      }
    ]
  },

  'grade6-lower': {
    semester: '六年级下册',
    chapters: [
      {
        id: 'g6l-1',
        unit: 1,
        name: '负数',
        knowledges: [
          { id: 'g6l-1-1', unit: 1, name: '负数的认识', semester: '六年级下册', difficulty_range: [1, 1] },
          { id: 'g6l-1-2', unit: 1, name: '在直线上表示正数、0和负数', semester: '六年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g6l-2',
        unit: 2,
        name: '百分数（二）',
        knowledges: [
          { id: 'g6l-2-1', unit: 2, name: '折扣', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-2-2', unit: 2, name: '成数', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-2-3', unit: 2, name: '税率', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-2-4', unit: 2, name: '利率', semester: '六年级下册', difficulty_range: [1, 2] }
        ]
      },
      {
        id: 'g6l-3',
        unit: 3,
        name: '圆柱与圆锥',
        knowledges: [
          { id: 'g6l-3-1', unit: 3, name: '圆柱的认识', semester: '六年级下册', difficulty_range: [1, 1] },
          { id: 'g6l-3-2', unit: 3, name: '圆柱的表面积', semester: '六年级下册', difficulty_range: [2, 3] },
          { id: 'g6l-3-3', unit: 3, name: '圆柱的体积', semester: '六年级下册', difficulty_range: [2, 3] },
          { id: 'g6l-3-4', unit: 3, name: '圆锥的认识', semester: '六年级下册', difficulty_range: [1, 1] },
          { id: 'g6l-3-5', unit: 3, name: '圆锥的体积', semester: '六年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6l-4',
        unit: 4,
        name: '比例',
        knowledges: [
          { id: 'g6l-4-1', unit: 4, name: '比例的意义和基本性质', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-4-2', unit: 4, name: '解比例', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-4-3', unit: 4, name: '正比例', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-4-4', unit: 4, name: '反比例', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-4-5', unit: 4, name: '比例尺', semester: '六年级下册', difficulty_range: [2, 3] },
          { id: 'g6l-4-6', unit: 4, name: '图形的放大与缩小', semester: '六年级下册', difficulty_range: [1, 2] },
          { id: 'g6l-4-7', unit: 4, name: '用比例解决问题', semester: '六年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6l-5',
        unit: 5,
        name: '数学广角——鸽巢问题',
        knowledges: [
          { id: 'g6l-5-1', unit: 5, name: '鸽巢问题', semester: '六年级下册', difficulty_range: [2, 3] }
        ]
      },
      {
        id: 'g6l-6',
        unit: 6,
        name: '整理和复习',
        knowledges: [
          { id: 'g6l-6-1', unit: 6, name: '数与代数', semester: '六年级下册', difficulty_range: [1, 3] },
          { id: 'g6l-6-2', unit: 6, name: '图形与几何', semester: '六年级下册', difficulty_range: [1, 3] },
          { id: 'g6l-6-3', unit: 6, name: '统计与概率', semester: '六年级下册', difficulty_range: [1, 3] }
        ]
      }
    ]
  }
};

// ==================== 导出方法 ====================

/**
 * 获取年级列表
 * @returns {Array} 年级列表
 */
const getGradeList = () => {
  return [
    { id: 'grade1', name: '一年级' },
    { id: 'grade2', name: '二年级' },
    { id: 'grade3', name: '三年级' },
    { id: 'grade4', name: '四年级' },
    { id: 'grade5', name: '五年级' },
    { id: 'grade6', name: '六年级' }
  ];
};

/**
 * 获取某年级某学期的单元列表
 * @param {string} gradeId 年级ID，如 'grade5'
 * @param {string} semester 学期，'upper'(上册) 或 'lower'(下册)
 * @returns {Array} 单元列表
 */
const getChapterList = (gradeId, semester) => {
  const key = `${gradeId}-${semester}`;
  const data = knowledgeData[key];

  if (!data) {
    console.error('未找到数据:', key);
    return [];
  }

  return data.chapters.map(chapter => ({
    id: chapter.id,
    unit: chapter.unit,
    name: chapter.name,
    knowledgeCount: chapter.knowledges.length
  }));
};

/**
 * 获取某单元的知识点列表
 * @param {string} chapterId 单元ID
 * @returns {Array} 知识点列表
 */
const getKnowledgeList = (chapterId) => {
  for (const key in knowledgeData) {
    const chapter = knowledgeData[key].chapters.find(c => c.id === chapterId);
    if (chapter) {
      return chapter.knowledges;
    }
  }
  return [];
};

/**
 * 根据id获取知识点详情
 * @param {string} id 知识点ID
 * @returns {object|null} 知识点详情
 */
const getKnowledgeById = (id) => {
  for (const key in knowledgeData) {
    for (const chapter of knowledgeData[key].chapters) {
      const knowledge = chapter.knowledges.find(k => k.id === id);
      if (knowledge) {
        return knowledge;
      }
    }
  }
  return null;
};

/**
 * 获取所有知识点
 * @returns {Array} 所有知识点列表
 */
const getAllKnowledges = () => {
  const allKnowledges = [];
  for (const key in knowledgeData) {
    for (const chapter of knowledgeData[key].chapters) {
      for (const knowledge of chapter.knowledges) {
        allKnowledges.push(knowledge);
      }
    }
  }
  return allKnowledges;
};

/**
 * 根据难度获取知识点
 * @param {number} difficulty 难度等级 1-3
 * @returns {Array} 符合难度的知识点列表
 */
const getKnowledgesByDifficulty = (difficulty) => {
  return getAllKnowledges().filter(k =>
    k.difficulty_range[0] <= difficulty && k.difficulty_range[1] >= difficulty
  );
};

module.exports = {
  knowledgeData,
  getGradeList,
  getChapterList,
  getKnowledgeList,
  getKnowledgeById,
  getAllKnowledges,
  getKnowledgesByDifficulty
};
