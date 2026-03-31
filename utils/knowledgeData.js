/**
 * 五年级数学知识点数据库
 * 按照人教版五年级上下册目录整理
 */

// 五年级数学知识点数据
const knowledgeData = {
  // ==================== 上册 ====================
  'upper': {
    semester: '上册',
    chapters: [
      {
        id: 'upper-1',
        unit: 1,
        name: '小数乘法',
        knowledges: [
          {
            id: 'upper-1-1',
            unit: 1,
            name: '小数乘整数',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '小数乘以整数的计算',
              template: '一件商品价格是 {price} 元，买 {count} 件需要多少钱？',
              parameters: {
                price: { type: 'decimal', range: [0.1, 99.9], precision: 2 },
                count: { type: 'integer', range: [2, 20] }
              },
              calculation: '{price} × {count}',
              hint: '先将小数看作整数相乘，再根据小数位数点上小数点',
              explanation: '小数乘整数，先按照整数乘法计算，再看小数有几位，就从积的右边起数出几位点上小数点'
            }
          },
          {
            id: 'upper-1-2',
            unit: 1,
            name: '小数乘小数',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '小数乘以小数的计算',
              template: '计算：{num1} × {num2} = ?',
              parameters: {
                num1: { type: 'decimal', range: [0.1, 99.9], precision: 2 },
                num2: { type: 'decimal', range: [0.1, 99.9], precision: 2 }
              },
              calculation: '{num1} × {num2}',
              hint: '两个乘数共有几位小数，积就有几位小数',
              explanation: '小数乘小数，先按整数乘法算出积，再看两个乘数中一共有几位小数，就从积的右边起数出几位点上小数点'
            }
          },
          {
            id: 'upper-1-3',
            unit: 1,
            name: '积的近似值',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '求乘积的近似值（四舍五入）',
              template: '计算 {num1} × {num2}，结果保留{decimal}位小数',
              parameters: {
                num1: { type: 'decimal', range: [0.01, 99.99], precision: 3 },
                num2: { type: 'decimal', range: [0.01, 99.99], precision: 3 },
                decimal: { type: 'choice', options: ['一', '两'] }
              },
              calculation: '{num1} × {num2}，保留{decimal}位小数',
              hint: '先用四舍五入法看需要保留位数的下一位',
              explanation: '求积的近似值，先算出准确的积，再用四舍五入法保留指定的小数位数'
            }
          },
          {
            id: 'upper-1-4',
            unit: 1,
            name: '小数乘法运算定律',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '运用运算定律进行简便计算',
              template: '简便计算：{expression}',
              parameters: {
                expression: { type: 'formula', examples: ['0.25 × 4.78 × 4', '1.25 × 32', '5.6 × 10.1'] }
              },
              calculation: '运用乘法交换律、结合律或分配律',
              hint: '观察数字特点，看能否凑整或运用运算定律',
              explanation: '整数乘法的交换律、结合律和分配律，对于小数乘法同样适用'
            }
          }
        ]
      },
      {
        id: 'upper-2',
        unit: 2,
        name: '位置',
        knowledges: [
          {
            id: 'upper-2-1',
            unit: 2,
            name: '用数对表示位置',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '用数对表示物体的位置',
              template: '小明在教室的第{row}行第{col}列，用数对表示是？',
              parameters: {
                row: { type: 'integer', range: [1, 10] },
                col: { type: 'integer', range: [1, 10] }
              },
              calculation: '({col}, {row})',
              hint: '数对中，列在前，行在后',
              explanation: '用有顺序的两个数表示一个确定的位置，就是数对。写数对时，列数在前，行数在后，中间用逗号隔开，用括号括起来'
            }
          }
        ]
      },
      {
        id: 'upper-3',
        unit: 3,
        name: '小数除法',
        knowledges: [
          {
            id: 'upper-3-1',
            unit: 3,
            name: '除数是整数的小数除法',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '小数除以整数的计算',
              template: '计算：{dividend} ÷ {divisor} = ?',
              parameters: {
                dividend: { type: 'decimal', range: [1, 99.9], precision: 2 },
                divisor: { type: 'integer', range: [2, 9] }
              },
              calculation: '{dividend} ÷ {divisor}',
              hint: '按照整数除法的方法计算，商的小数点要和被除数的小数点对齐',
              explanation: '小数除以整数，先按整数除法的方法去除，商的小数点要和被除数的小数点对齐'
            }
          },
          {
            id: 'upper-3-2',
            unit: 3,
            name: '除数是小数的小数除法',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '一个数除以小数的计算',
              template: '计算：{dividend} ÷ {divisor} = ?',
              parameters: {
                dividend: { type: 'decimal', range: [1, 99.9], precision: 2 },
                divisor: { type: 'decimal', range: [0.1, 9.9], precision: 1 }
              },
              calculation: '{dividend} ÷ {divisor}',
              hint: '先把除数转化成整数，被除数也扩大相同的倍数',
              explanation: '除数是小数的除法，先移动除数的小数点，使它变成整数，除数的小数点向右移动几位，被除数的小数点也向右移动几位，然后按照除数是整数的小数除法进行计算'
            }
          },
          {
            id: 'upper-3-3',
            unit: 3,
            name: '商的近似值',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '求商的近似值',
              template: '计算 {dividend} ÷ {divisor}，商保留{decimal}位小数',
              parameters: {
                dividend: { type: 'decimal', range: [1, 50], precision: 2 },
                divisor: { type: 'decimal', range: [0.5, 10], precision: 1 },
                decimal: { type: 'choice', options: ['一', '两'] }
              },
              calculation: '{dividend} ÷ {divisor}',
              hint: '计算时多除一位，再用四舍五入法',
              explanation: '求商的近似值，计算时要比需要保留的小数位数多除一位，然后按照四舍五入法取商的近似值'
            }
          },
          {
            id: 'upper-3-4',
            unit: 3,
            name: '循环小数',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '认识循环小数',
              template: '计算 {dividend} ÷ {divisor}，判断商是否是循环小数',
              parameters: {
                dividend: { type: 'integer', range: [1, 20] },
                divisor: { type: 'integer', range: [3, 11] }
              },
              calculation: '{dividend} ÷ {divisor}',
              hint: '看小数部分是否有依次不断重复出现的数字',
              explanation: '一个数的小数部分，从某一位起，一个数字或者几个数字依次不断重复出现，这样的小数叫做循环小数'
            }
          }
        ]
      },
      {
        id: 'upper-4',
        unit: 4,
        name: '可能性',
        knowledges: [
          {
            id: 'upper-4-1',
            unit: 4,
            name: '可能性的大小',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '判断可能性的大小',
              template: '一个盒子里有{red}个红球、{blue}个蓝球、{yellow}个黄球，随机摸一个球，摸到哪种颜色球的可能性最大？',
              parameters: {
                red: { type: 'integer', range: [1, 10] },
                blue: { type: 'integer', range: [1, 10] },
                yellow: { type: 'integer', range: [1, 10] }
              },
              calculation: '比较三种球的数量',
              hint: '哪种颜色的球数量最多，摸到的可能性就最大',
              explanation: '可能性的大小与数量的多少有关，在总数中所占数量越多，可能性越大；所占数量越少，可能性越小'
            }
          },
          {
            id: 'upper-4-2',
            unit: 4,
            name: '可能性的计算',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '计算可能性的分数表示',
              template: '一个袋子里有{total}个球，其中红球有{red}个，随机摸一个球，摸到红球的可能性是几分之几？',
              parameters: {
                total: { type: 'integer', range: [5, 20] },
                red: { type: 'integer', range: [1, 5] }
              },
              calculation: '{red}/{total}',
              hint: '可能性 = 红球数量 ÷ 总数量',
              explanation: '可能性的大小可以用分数表示，分子是所求情况的数量，分母是所有情况的总数'
            }
          }
        ]
      },
      {
        id: 'upper-5',
        unit: 5,
        name: '简易方程',
        knowledges: [
          {
            id: 'upper-5-1',
            unit: 5,
            name: '用字母表示数',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '用字母表示数量关系',
              template: '小明今年{age}岁，爸爸比他大{diff}岁，用字母a表示小明今年的年龄，爸爸今年的年龄可以表示为？',
              parameters: {
                age: { type: 'integer', range: [8, 12] },
                diff: { type: 'integer', range: [20, 30] }
              },
              calculation: 'a + {diff}',
              hint: '用字母表示数量关系，字母和数字相乘时可以简写',
              explanation: '用字母表示数可以简明地表示数量关系、运算定律和计算公式'
            }
          },
          {
            id: 'upper-5-2',
            unit: 5,
            name: '方程的意义',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '判断方程',
              template: '判断下列式子哪些是方程：{expressions}',
              parameters: {
                expressions: { type: 'list', examples: ['3x + 5 = 14', '5 + 3 = 8', '2x = 6', 'x + 4 > 7', '6 - x'] }
              },
              calculation: '含有未知数的等式是方程',
              hint: '方程必须同时满足两个条件：含有未知数、是等式',
              explanation: '含有未知数的等式叫做方程。方程必须同时满足两个条件：一是含有未知数，二是必须是等式'
            }
          },
          {
            id: 'upper-5-3',
            unit: 5,
            name: '解方程（一步）',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '解简单的一步方程',
              template: '解方程：{equation}',
              parameters: {
                equation: { type: 'equation', examples: ['x + 8 = 15', 'x - 3.5 = 7', '4x = 24', 'x ÷ 5 = 8'] }
              },
              calculation: '求出x的值',
              hint: '等式两边同时加上、减去、乘或除以同一个数，等式仍然成立',
              explanation: '解方程就是求出方程的解的过程。等式两边同时加上、减去同一个数，或同时乘、除以同一个不为0的数，等式仍然成立'
            }
          },
          {
            id: 'upper-5-4',
            unit: 5,
            name: '解方程（两步）',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '解两步方程',
              template: '解方程：{equation}',
              parameters: {
                equation: { type: 'equation', examples: ['2x + 5 = 17', '3x - 8 = 16', '5 + 2x = 15', '4x ÷ 2 = 12'] }
              },
              calculation: '先算一步，再解方程',
              hint: '先把能算的部分算出来，或者把含x的部分看作一个整体',
              explanation: '解两步方程，可以把含有x的部分看作一个整体，先求出这个整体的值，再求x的值'
            }
          },
          {
            id: 'upper-5-5',
            unit: 5,
            name: '列方程解决问题',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '列方程解决实际问题',
              template: '小明买了{count}本笔记本，共花了{total}元，每本笔记本多少元？（列方程解答）',
              parameters: {
                count: { type: 'integer', range: [3, 10] },
                total: { type: 'decimal', range: [10, 50], precision: 1 }
              },
              calculation: '设每本笔记本x元，列方程：{count}x = {total}',
              hint: '设未知数，找出等量关系，列方程',
              explanation: '列方程解决实际问题的一般步骤：1.设未知数；2.找出等量关系；3.列方程；4.解方程；5.检验并写答'
            }
          }
        ]
      },
      {
        id: 'upper-6',
        unit: 6,
        name: '多边形的面积',
        knowledges: [
          {
            id: 'upper-6-1',
            unit: 6,
            name: '平行四边形的面积',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '计算平行四边形面积',
              template: '一个平行四边形的底是{base}厘米，高是{height}厘米，它的面积是多少平方厘米？',
              parameters: {
                base: { type: 'decimal', range: [2, 20], precision: 1 },
                height: { type: 'decimal', range: [2, 15], precision: 1 }
              },
              calculation: '{base} × {height}',
              hint: '平行四边形面积 = 底 × 高',
              explanation: '平行四边形的面积 = 底 × 高，用字母表示为 S = ah'
            }
          },
          {
            id: 'upper-6-2',
            unit: 6,
            name: '三角形的面积',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '计算三角形面积',
              template: '一个三角形的底是{base}厘米，高是{height}厘米，它的面积是多少平方厘米？',
              parameters: {
                base: { type: 'decimal', range: [3, 20], precision: 1 },
                height: { type: 'decimal', range: [2, 15], precision: 1 }
              },
              calculation: '{base} × {height} ÷ 2',
              hint: '三角形面积 = 底 × 高 ÷ 2',
              explanation: '三角形的面积 = 底 × 高 ÷ 2，用字母表示为 S = ah ÷ 2'
            }
          },
          {
            id: 'upper-6-3',
            unit: 6,
            name: '梯形的面积',
            semester: '上册',
            difficulty_range: [1, 2],
            example: {
              description: '计算梯形面积',
              template: '一个梯形的上底是{top}厘米，下底是{bottom}厘米，高是{height}厘米，它的面积是多少平方厘米？',
              parameters: {
                top: { type: 'decimal', range: [2, 10], precision: 1 },
                bottom: { type: 'decimal', range: [5, 20], precision: 1 },
                height: { type: 'decimal', range: [2, 12], precision: 1 }
              },
              calculation: '({top} + {bottom}) × {height} ÷ 2',
              hint: '梯形面积 = (上底 + 下底) × 高 ÷ 2',
              explanation: '梯形的面积 = (上底 + 下底) × 高 ÷ 2，用字母表示为 S = (a + b)h ÷ 2'
            }
          },
          {
            id: 'upper-6-4',
            unit: 6,
            name: '组合图形的面积',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '计算组合图形面积',
              template: '一个组合图形由一个正方形和一个三角形组成，正方形边长为{side}厘米，三角形的底等于正方形边长，高为{height}厘米，求总面积。',
              parameters: {
                side: { type: 'integer', range: [4, 10] },
                height: { type: 'integer', range: [2, 8] }
              },
              calculation: '{side} × {side} + {side} × {height} ÷ 2',
              hint: '组合图形面积 = 各部分面积之和',
              explanation: '求组合图形的面积，可以把组合图形分成几个简单的图形，分别求出它们的面积，再相加'
            }
          }
        ]
      },
      {
        id: 'upper-7',
        unit: 7,
        name: '数学广角——植树问题',
        knowledges: [
          {
            id: 'upper-7-1',
            unit: 7,
            name: '两端都栽的植树问题',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '两端都栽的植树问题',
              template: '一条路长{length}米，每隔{interval}米栽一棵树，两端都栽，一共需要栽多少棵树？',
              parameters: {
                length: { type: 'integer', range: [20, 200] },
                interval: { type: 'integer', range: [5, 20] }
              },
              calculation: '{length} ÷ {interval} + 1',
              hint: '两端都栽时，棵数 = 间隔数 + 1',
              explanation: '在一条线段上植树，两端都栽时，棵数 = 总长 ÷ 间隔 + 1 = 间隔数 + 1'
            }
          },
          {
            id: 'upper-7-2',
            unit: 7,
            name: '两端都不栽的植树问题',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '两端都不栽的植树问题',
              template: '一条路长{length}米，每隔{interval}米栽一棵树，两端都不栽，一共需要栽多少棵树？',
              parameters: {
                length: { type: 'integer', range: [20, 200] },
                interval: { type: 'integer', range: [5, 20] }
              },
              calculation: '{length} ÷ {interval} - 1',
              hint: '两端都不栽时，棵数 = 间隔数 - 1',
              explanation: '在一条线段上植树，两端都不栽时，棵数 = 总长 ÷ 间隔 - 1 = 间隔数 - 1'
            }
          },
          {
            id: 'upper-7-3',
            unit: 7,
            name: '环形植树问题',
            semester: '上册',
            difficulty_range: [2, 3],
            example: {
              description: '环形植树问题',
              template: '一个圆形花坛的周长是{length}米，每隔{interval}米栽一棵树，一共需要栽多少棵树？',
              parameters: {
                length: { type: 'integer', range: [30, 150] },
                interval: { type: 'integer', range: [3, 15] }
              },
              calculation: '{length} ÷ {interval}',
              hint: '环形植树时，棵数 = 间隔数',
              explanation: '在封闭路线上植树，棵数 = 总长 ÷ 间隔 = 间隔数'
            }
          }
        ]
      }
    ]
  },

  // ==================== 下册 ====================
  'lower': {
    semester: '下册',
    chapters: [
      {
        id: 'lower-1',
        unit: 1,
        name: '观察物体（三）',
        knowledges: [
          {
            id: 'lower-1-1',
            unit: 1,
            name: '根据视图还原立体图形',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '根据三视图确定小正方体的数量',
              template: '用若干个小正方体搭成一个立体图形，从正面看是{front}，从左面看是{left}，从上面看是{top}，这个立体图形最少需要多少个小正方体？',
              parameters: {
                front: { type: 'view', examples: ['2个并排', '田字形', 'L形'] },
                left: { type: 'view', examples: ['1个', '2个叠放'] },
                top: { type: 'view', examples: ['2个并排', 'T形'] }
              },
              calculation: '根据视图分析小正方体数量',
              hint: '从上面看确定底面形状，从正面和左面看确定高度',
              explanation: '根据视图还原立体图形，需要综合考虑三个方向的视图，从上面看可以确定底面形状，从正面和左面看可以确定高度'
            }
          }
        ]
      },
      {
        id: 'lower-2',
        unit: 2,
        name: '因数与倍数',
        knowledges: [
          {
            id: 'lower-2-1',
            unit: 2,
            name: '因数和倍数的认识',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '找一个数的因数或倍数',
              template: '{operation}？',
              parameters: {
                operation: { type: 'choice', options: [
                  '找出24的所有因数',
                  '找出30的所有因数',
                  '找出7的所有倍数（写出前5个）',
                  '找出9的所有倍数（写出前5个）'
                ]}
              },
              calculation: '列出所有符合条件的数',
              hint: '因数是成对出现的，倍数是无限的',
              explanation: '如果a × b = c，那么a和b是c的因数，c是a和b的倍数。一个数的因数个数是有限的，倍数个数是无限的'
            }
          },
          {
            id: 'lower-2-2',
            unit: 2,
            name: '2、3、5的倍数特征',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '判断或找出2、3、5的倍数',
              template: '在下列数中找出{type}的倍数：{numbers}',
              parameters: {
                type: { type: 'choice', options: ['2', '3', '5', '2和5', '2和3'] },
                numbers: { type: 'list', examples: ['12', '25', '36', '40', '51', '60', '72', '85'] }
              },
              calculation: '根据特征筛选',
              hint: '2的倍数个位是0、2、4、6、8；5的倍数个位是0或5；3的倍数各位数字之和是3的倍数',
              explanation: '2的倍数特征：个位是0、2、4、6、8；5的倍数特征：个位是0或5；3的倍数特征：各位数字之和是3的倍数'
            }
          },
          {
            id: 'lower-2-3',
            unit: 2,
            name: '质数和合数',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '判断质数和合数',
              template: '判断下列数哪些是质数，哪些是合数：{numbers}',
              parameters: {
                numbers: { type: 'list', examples: ['1', '2', '9', '11', '15', '17', '21', '23', '27', '31'] }
              },
              calculation: '根据因数个数判断',
              hint: '只有1和它本身两个因数的数是质数，有三个或以上因数的数是合数',
              explanation: '一个数，如果只有1和它本身两个因数，这样的数叫做质数（或素数）。一个数，如果除了1和它本身还有别的因数，这样的数叫做合数。1既不是质数也不是合数'
            }
          },
          {
            id: 'lower-2-4',
            unit: 2,
            name: '分解质因数',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '把一个合数分解质因数',
              template: '把{number}分解质因数',
              parameters: {
                number: { type: 'integer', range: [12, 100] }
              },
              calculation: '{number} = 质因数相乘的形式',
              hint: '用短除法，除到商是质数为止',
              explanation: '把一个合数用质因数相乘的形式表示出来，叫做分解质因数。可以用短除法进行分解'
            }
          },
          {
            id: 'lower-2-5',
            unit: 2,
            name: '最大公因数',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '求两个数的最大公因数',
              template: '求{num1}和{num2}的最大公因数',
              parameters: {
                num1: { type: 'integer', range: [12, 60] },
                num2: { type: 'integer', range: [12, 60] }
              },
              calculation: '找出两个数的公因数中最大的一个',
              hint: '可以用列举法或短除法',
              explanation: '几个数公有的因数，叫做这几个数的公因数，其中最大的一个叫做这几个数的最大公因数'
            }
          },
          {
            id: 'lower-2-6',
            unit: 2,
            name: '最小公倍数',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '求两个数的最小公倍数',
              template: '求{num1}和{num2}的最小公倍数',
              parameters: {
                num1: { type: 'integer', range: [4, 20] },
                num2: { type: 'integer', range: [4, 20] }
              },
              calculation: '找出两个数的公倍数中最小的一个',
              hint: '可以用列举法或短除法',
              explanation: '几个数公有的倍数，叫做这几个数的公倍数，其中最小的一个叫做这几个数的最小公倍数'
            }
          }
        ]
      },
      {
        id: 'lower-3',
        unit: 3,
        name: '长方体和正方体',
        knowledges: [
          {
            id: 'lower-3-1',
            unit: 3,
            name: '长方体和正方体的认识',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '认识长方体和正方体的特征',
              template: '一个长方体长{length}厘米，宽{width}厘米，高{height}厘米，它的棱长总和是多少厘米？',
              parameters: {
                length: { type: 'integer', range: [3, 15] },
                width: { type: 'integer', range: [2, 10] },
                height: { type: 'integer', range: [2, 10] }
              },
              calculation: '({length} + {width} + {height}) × 4',
              hint: '长方体有12条棱，分为3组，每组4条',
              explanation: '长方体有6个面、12条棱、8个顶点。12条棱分为长、宽、高各4条，棱长总和 = (长 + 宽 + 高) × 4'
            }
          },
          {
            id: 'lower-3-2',
            unit: 3,
            name: '长方体和正方体的表面积',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '计算长方体或正方体的表面积',
              template: '{shape}的长/边长是{length}{unit}，{extra}，它的表面积是多少平方{unit}？',
              parameters: {
                shape: { type: 'choice', options: ['一个长方体', '一个正方体'] },
                length: { type: 'integer', range: [3, 12] },
                unit: { type: 'choice', options: ['厘米', '分米', '米'] },
                extra: { type: 'choice', options: ['宽是...厘米，高是...厘米', ''] }
              },
              calculation: '根据形状计算表面积',
              hint: '长方体表面积 = (长×宽 + 长×高 + 宽×高) × 2；正方体表面积 = 棱长² × 6',
              explanation: '长方体或正方体6个面的总面积叫做它的表面积。长方体表面积 = (长×宽 + 长×高 + 宽×高) × 2；正方体表面积 = 棱长² × 6'
            }
          },
          {
            id: 'lower-3-3',
            unit: 3,
            name: '长方体和正方体的体积',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '计算长方体或正方体的体积',
              template: '{shape}的{dimensions}，它的体积是多少立方{unit}？',
              parameters: {
                shape: { type: 'choice', options: ['一个长方体', '一个正方体'] },
                dimensions: { type: 'string', examples: ['长是8厘米，宽是5厘米，高是3厘米', '棱长是4分米'] },
                unit: { type: 'choice', options: ['厘米', '分米', '米'] }
              },
              calculation: '根据形状计算体积',
              hint: '长方体体积 = 长 × 宽 × 高；正方体体积 = 棱长³',
              explanation: '物体所占空间的大小叫做物体的体积。长方体体积 = 长 × 宽 × 高 = 底面积 × 高；正方体体积 = 棱长 × 棱长 × 棱长 = 棱长³'
            }
          },
          {
            id: 'lower-3-4',
            unit: 3,
            name: '体积单位间的进率',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '体积单位换算',
              template: '{from_value}立方{from_unit} = ?立方{to_unit}',
              parameters: {
                from_value: { type: 'integer', range: [1, 1000] },
                from_unit: { type: 'choice', options: ['厘米', '分米', '米'] },
                to_unit: { type: 'choice', options: ['厘米', '分米', '米'] }
              },
              calculation: '根据单位间的进率进行换算',
              hint: '1立方米 = 1000立方分米，1立方分米 = 1000立方厘米',
              explanation: '相邻的两个体积单位之间的进率是1000。1立方米 = 1000立方分米，1立方分米 = 1000立方厘米'
            }
          },
          {
            id: 'lower-3-5',
            unit: 3,
            name: '容积和容积单位',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '容积的计算和单位换算',
              template: '一个油箱从里面量长{length}分米，宽{width}分米，高{height}分米，这个油箱能装多少升油？',
              parameters: {
                length: { type: 'decimal', range: [2, 10], precision: 1 },
                width: { type: 'decimal', range: [1.5, 6], precision: 1 },
                height: { type: 'decimal', range: [1, 4], precision: 1 }
              },
              calculation: '{length} × {width} × {height}（结果单位：升）',
              hint: '容积单位有升和毫升，1升 = 1立方分米，1毫升 = 1立方厘米',
              explanation: '容器所能容纳物体的体积叫做容器的容积。容积单位有升(L)和毫升(mL)，1升 = 1立方分米，1毫升 = 1立方厘米，1升 = 1000毫升'
            }
          }
        ]
      },
      {
        id: 'lower-4',
        unit: 4,
        name: '分数的意义和性质',
        knowledges: [
          {
            id: 'lower-4-1',
            unit: 4,
            name: '分数的意义',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '理解分数的意义',
              template: '把{total}个苹果平均分给{people}个人，每个人分得这些苹果的几分之几？每个人分得几个苹果？',
              parameters: {
                total: { type: 'integer', range: [4, 12] },
                people: { type: 'integer', range: [2, 6] }
              },
              calculation: '每人分得1/{people}，每人分得{total}/{people}个',
              hint: '分数表示把单位"1"平均分成若干份，表示其中的一份或几份',
              explanation: '把单位"1"平均分成若干份，表示这样的一份或几份的数叫做分数。表示其中一份的数叫做分数单位'
            }
          },
          {
            id: 'lower-4-2',
            unit: 4,
            name: '分数与除法的关系',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '分数与除法的转换',
              template: '{numerator} ÷ {denominator} = ?（用分数表示商）',
              parameters: {
                numerator: { type: 'integer', range: [1, 20] },
                denominator: { type: 'integer', range: [2, 10] }
              },
              calculation: '{numerator}/{denominator}',
              hint: '被除数相当于分子，除数相当于分母',
              explanation: '分数与除法的关系：被除数 ÷ 除数 = 被除数/除数，用字母表示为 a ÷ b = a/b (b≠0)'
            }
          },
          {
            id: 'lower-4-3',
            unit: 4,
            name: '真分数和假分数',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '判断真分数和假分数',
              template: '判断下列分数哪些是真分数，哪些是假分数：{fractions}',
              parameters: {
                fractions: { type: 'list', examples: ['1/3', '3/3', '5/4', '7/8', '9/5', '2/2', '6/7'] }
              },
              calculation: '根据分子和分母的大小关系判断',
              hint: '真分数的分子比分母小，假分数的分子大于或等于分母',
              explanation: '分子比分母小的分数叫做真分数，真分数小于1；分子比分母大或分子和分母相等的分数叫做假分数，假分数大于或等于1'
            }
          },
          {
            id: 'lower-4-4',
            unit: 4,
            name: '分数的基本性质',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '应用分数的基本性质',
              template: '把{fraction}的分母乘{multiplier}，要使分数大小不变，分子应该怎样变化？',
              parameters: {
                fraction: { type: 'fraction', examples: ['2/3', '5/6', '3/4'] },
                multiplier: { type: 'integer', range: [2, 5] }
              },
              calculation: '分子也乘{multiplier}',
              hint: '分数的分子和分母同时乘或除以相同的数（0除外），分数大小不变',
              explanation: '分数的基本性质：分数的分子和分母同时乘或除以相同的数（0除外），分数的大小不变'
            }
          },
          {
            id: 'lower-4-5',
            unit: 4,
            name: '约分',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '约分',
              template: '把{fraction}约分',
              parameters: {
                fraction: { type: 'fraction', examples: ['12/18', '15/20', '24/36', '9/12'] }
              },
              calculation: '约分成最简分数',
              hint: '用分子和分母的公因数约分，直到分子和分母互质',
              explanation: '把一个分数化成和它相等，但分子和分母都比较小的分数，叫做约分。分子和分母只有公因数1的分数叫做最简分数'
            }
          },
          {
            id: 'lower-4-6',
            unit: 4,
            name: '通分',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '通分并比较大小',
              template: '把{frac1}和{frac2}通分，再比较大小',
              parameters: {
                frac1: { type: 'fraction', examples: ['2/3', '3/4', '5/6'] },
                frac2: { type: 'fraction', examples: ['3/5', '5/8', '7/12'] }
              },
              calculation: '找出公分母，通分后比较',
              hint: '用两个分母的最小公倍数作公分母',
              explanation: '把异分母分数分别化成和原来分数相等的同分母分数，叫做通分。通分时一般用两个分母的最小公倍数作公分母'
            }
          },
          {
            id: 'lower-4-7',
            unit: 4,
            name: '分数和小数的互化',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '分数和小数的互化',
              template: '{operation}',
              parameters: {
                operation: { type: 'choice', options: [
                  '把0.25化成最简分数',
                  '把0.75化成最简分数',
                  '把3/4化成小数',
                  '把7/8化成小数'
                ]}
              },
              calculation: '进行分数和小数的互化',
              hint: '小数化分数：先化成分母是10、100...的分数再约分；分数化小数：用分子除以分母',
              explanation: '小数化分数：原来有几位小数，就在1后面写几个0作分母，原来的小数去掉小数点作分子，能约分的要约分。分数化小数：用分子除以分母，除不尽时根据要求保留一定小数位数'
            }
          }
        ]
      },
      {
        id: 'lower-5',
        unit: 5,
        name: '分数的加法和减法',
        knowledges: [
          {
            id: 'lower-5-1',
            unit: 5,
            name: '同分母分数加减法',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '同分母分数加减法',
              template: '计算：{frac1} {op} {frac2}',
              parameters: {
                frac1: { type: 'fraction', denominator: [5, 8, 9, 10, 12], examples: ['2/5', '3/8'] },
                frac2: { type: 'fraction', same_denominator: true, examples: ['1/5', '5/8'] },
                op: { type: 'choice', options: ['+', '-'] }
              },
              calculation: '分母不变，分子相加减',
              hint: '同分母分数相加减，分母不变，分子相加减',
              explanation: '同分母分数相加减，分母不变，只把分子相加减。计算结果能约分的要约成最简分数'
            }
          },
          {
            id: 'lower-5-2',
            unit: 5,
            name: '异分母分数加减法',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '异分母分数加减法',
              template: '计算：{frac1} {op} {frac2}',
              parameters: {
                frac1: { type: 'fraction', examples: ['1/2', '2/3', '3/4'] },
                frac2: { type: 'fraction', examples: ['1/3', '1/4', '1/6'] },
                op: { type: 'choice', options: ['+', '-'] }
              },
              calculation: '先通分，再按同分母分数加减法计算',
              hint: '异分母分数相加减，先通分，再按同分母分数加减法计算',
              explanation: '异分母分数相加减，先通分，化成同分母分数，然后按照同分母分数加减法的方法进行计算'
            }
          },
          {
            id: 'lower-5-3',
            unit: 5,
            name: '分数加减混合运算',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '分数加减混合运算',
              template: '计算：{expression}',
              parameters: {
                expression: { type: 'formula', examples: ['1/2 + 1/3 - 1/4', '5/6 - 1/3 + 1/2', '3/4 + 1/5 - 1/10'] }
              },
              calculation: '按运算顺序计算',
              hint: '可以一次通分，也可以分步通分',
              explanation: '分数加减混合运算的运算顺序与整数加减混合运算相同。没有括号的从左往右计算，有括号的先算括号里面的'
            }
          },
          {
            id: 'lower-5-4',
            unit: 5,
            name: '解决实际问题',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '用分数加减法解决实际问题',
              template: '一块地，种玉米用了{corn}，种大豆用了{soybean}，种玉米比种大豆多用这块地的几分之几？还剩这块地的几分之几？',
              parameters: {
                corn: { type: 'fraction', examples: ['2/5', '3/8', '5/12'] },
                soybean: { type: 'fraction', examples: ['1/5', '1/4', '1/6'] }
              },
              calculation: '{corn} - {soybean} 和 1 - {corn} - {soybean}',
              hint: '把整块地看作单位"1"',
              explanation: '解决分数实际问题时，要找准单位"1"，理解分数的意义，根据题意列出算式'
            }
          }
        ]
      },
      {
        id: 'lower-6',
        unit: 6,
        name: '统计',
        knowledges: [
          {
            id: 'lower-6-1',
            unit: 6,
            name: '折线统计图',
            semester: '下册',
            difficulty_range: [1, 2],
            example: {
              description: '折线统计图的读取和分析',
              template: '某地{year}年{period}的气温如下：{data}。请根据数据分析：（1）哪天温差最大？（2）气温是怎样变化的？',
              parameters: {
                year: { type: 'integer', range: [2020, 2024] },
                period: { type: 'choice', options: ['一周', '五天'] },
                data: { type: 'list', examples: ['周一18°C', '周二20°C', '周三22°C', '周四19°C', '周五25°C'] }
              },
              calculation: '分析数据变化趋势',
              hint: '折线统计图能清楚地反映数量的增减变化情况',
              explanation: '折线统计图是用一个单位长度表示一定的数量，根据数量的多少描出各点，然后把各点用线段顺次连接起来。折线统计图不但可以表示出数量的多少，而且能够清楚地表示出数量增减变化的情况'
            }
          },
          {
            id: 'lower-6-2',
            unit: 6,
            name: '复式折线统计图',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '复式折线统计图的分析',
              template: '甲乙两地{year}年{start}月到{end}月的平均气温如下：甲地{data1}；乙地{data2}。请分析：（1）两地气温变化趋势有什么不同？（2）哪个城市的温差更大？',
              parameters: {
                year: { type: 'integer', range: [2020, 2024] },
                start: { type: 'integer', range: [1, 6] },
                end: { type: 'integer', range: [7, 12] },
                data1: { type: 'list', examples: ['15°C', '18°C', '22°C', '26°C', '30°C', '32°C'] },
                data2: { type: 'list', examples: ['20°C', '22°C', '24°C', '26°C', '28°C', '30°C'] }
              },
              calculation: '比较两组数据的变化',
              hint: '复式折线统计图可以比较两组数据的变化趋势',
              explanation: '复式折线统计图可以比较两组或多组数据的变化情况，便于分析各组数据之间的关系和差异'
            }
          }
        ]
      },
      {
        id: 'lower-7',
        unit: 7,
        name: '数学广角——找次品',
        knowledges: [
          {
            id: 'lower-7-1',
            unit: 7,
            name: '找次品问题',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '找次品的最优策略',
              template: '有{total}个零件，其中一个是次品（轻一些），用天平称，至少称几次能保证找出次品？',
              parameters: {
                total: { type: 'integer', range: [3, 27] }
              },
              calculation: '根据物品数量确定最少称量次数',
              hint: '把物品分成3份，每份数量尽量相等',
              explanation: '找次品的最优策略：把待测物品分成3份，每份的数量尽量相等。如果物品数量是3的倍数，就平均分成3份；如果不是3的倍数，则使多的比少的只多1'
            }
          },
          {
            id: 'lower-7-2',
            unit: 7,
            name: '找次品的规律',
            semester: '下册',
            difficulty_range: [2, 3],
            example: {
              description: '找次品的规律总结',
              template: '在有{total}个物品中找一个次品，用天平称，最多需要{times}次。请说明理由。',
              parameters: {
                total: { type: 'choice', options: ['3', '9', '27', '81'] },
                times: { type: 'integer', range: [1, 5] }
              },
              calculation: '3^n ≥ 物品数量',
              hint: '称n次，最多能在3^n个物品中找出次品',
              explanation: '称n次，最多能在3^n个物品中找出次品。例如：称1次最多3个，称2次最多9个，称3次最多27个，称4次最多81个'
            }
          }
        ]
      }
    ]
  }
};

/**
 * 获取某学期的单元列表
 * @param {string} semester 学期，'upper'(上册) 或 'lower'(下册)
 * @returns {Array} 单元列表
 */
const getChapterList = (semester) => {
  const data = knowledgeData[semester];
  if (!data) {
    console.error(`未找到学期: ${semester}`);
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
 * @param {string} unitId 单元ID，如 'upper-1', 'lower-2'
 * @returns {Array} 知识点列表
 */
const getKnowledgeList = (unitId) => {
  // 解析学期和单元号
  const [semester, unitNum] = unitId.split('-');
  const data = knowledgeData[semester];

  if (!data) {
    console.error(`未找到学期: ${semester}`);
    return [];
  }

  const chapter = data.chapters.find(c => c.unit === parseInt(unitNum));
  if (!chapter) {
    console.error(`未找到单元: ${unitId}`);
    return [];
  }

  return chapter.knowledges.map(k => ({
    id: k.id,
    unit: k.unit,
    name: k.name,
    semester: k.semester,
    difficulty_range: k.difficulty_range
  }));
};

/**
 * 根据id获取知识点详情
 * @param {string} id 知识点ID，如 'upper-1-1', 'lower-2-3'
 * @returns {object|null} 知识点详情
 */
const getKnowledgeById = (id) => {
  // 解析ID
  const parts = id.split('-');
  if (parts.length !== 3) {
    console.error(`无效的知识点ID: ${id}`);
    return null;
  }

  const [semester, unitNum, knowledgeIndex] = parts;
  const data = knowledgeData[semester];

  if (!data) {
    console.error(`未找到学期: ${semester}`);
    return null;
  }

  const chapter = data.chapters.find(c => c.unit === parseInt(unitNum));
  if (!chapter) {
    console.error(`未找到单元: ${unitNum}`);
    return null;
  }

  const knowledge = chapter.knowledges[parseInt(knowledgeIndex) - 1];
  if (!knowledge) {
    console.error(`未找到知识点: ${id}`);
    return null;
  }

  return knowledge;
};

/**
 * 获取所有知识点
 * @returns {Array} 所有知识点列表
 */
const getAllKnowledges = () => {
  const allKnowledges = [];

  Object.keys(knowledgeData).forEach(semester => {
    knowledgeData[semester].chapters.forEach(chapter => {
      chapter.knowledges.forEach(knowledge => {
        allKnowledges.push(knowledge);
      });
    });
  });

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

/**
 * 根据学期获取所有知识点
 * @param {string} semester 学期
 * @returns {Array} 知识点列表
 */
const getKnowledgesBySemester = (semester) => {
  const data = knowledgeData[semester];
  if (!data) return [];

  const knowledges = [];
  data.chapters.forEach(chapter => {
    chapter.knowledges.forEach(knowledge => {
      knowledges.push(knowledge);
    });
  });

  return knowledges;
};

module.exports = {
  knowledgeData,
  getChapterList,
  getKnowledgeList,
  getKnowledgeById,
  getAllKnowledges,
  getKnowledgesByDifficulty,
  getKnowledgesBySemester
};
