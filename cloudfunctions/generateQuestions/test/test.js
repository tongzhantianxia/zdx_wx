// 云函数本地测试脚本
// 在微信开发者工具中右键云函数 -> 开启云函数本地调试

// ==================== 测试用例 ====================

// 测试用例1：除数是小数的小数除法（中等难度）
const testCase1 = {
  knowledgeId: "upper-3-2",
  knowledgeName: "除数是小数的小数除法",
  grade: "五年级",
  count: 3,
  difficulty: "medium",
  questionType: "calculation"
};

// 测试用例2：解方程（简单难度）
const testCase2 = {
  knowledgeId: "upper-5-3",
  knowledgeName: "解方程",
  grade: "五年级",
  count: 3,
  difficulty: "easy",
  questionType: "calculation"
};

// 测试用例3：三角形面积（困难难度，填空题）
const testCase3 = {
  knowledgeId: "upper-6-2",
  knowledgeName: "三角形面积",
  grade: "五年级",
  count: 3,
  difficulty: "hard",
  questionType: "fillBlank"
};

// ==================== 质量检查函数 ====================

/**
 * 检查题目质量
 * @param {object} result 云函数返回结果
 * @returns {object} 质量检查报告
 */
function checkQuality(result) {
  const report = {
    passed: true,
    errors: [],
    warnings: [],
    stats: {}
  };

  // 1. 检查基本结构
  if (!result.success) {
    report.passed = false;
    report.errors.push('❌ 云函数调用失败: ' + result.error);
    return report;
  }

  const questions = result.questions || [];
  report.stats.totalQuestions = questions.length;

  // 2. 检查题目数量
  if (questions.length === 0) {
    report.passed = false;
    report.errors.push('❌ 未生成任何题目');
    return report;
  }

  // 3. 逐题检查
  questions.forEach((q, index) => {
    const questionNum = index + 1;

    // 检查必填字段
    if (!q.content) {
      report.passed = false;
      report.errors.push(`❌ 第${questionNum}题: 缺少题目内容(content)`);
    }

    if (!q.answer) {
      report.passed = false;
      report.errors.push(`❌ 第${questionNum}题: 缺少答案(answer)`);
    }

    // 检查答案格式
    if (q.answer && typeof q.answer !== 'string') {
      report.warnings.push(`⚠️ 第${questionNum}题: 答案不是字符串格式`);
    }

    // 检查是否有解答过程
    if (!q.solution) {
      report.warnings.push(`⚠️ 第${questionNum}题: 缺少解答过程(solution)`);
    }

    // 检查是否有提示
    if (!q.tip) {
      report.warnings.push(`⚠️ 第${questionNum}题: 缺少解题提示(tip)`);
    }

    // 检查答案是否为纯数字（计算题）
    if (q.type === '计算题' && q.answer) {
      const numAnswer = q.answer.replace(/\s/g, '');
      if (isNaN(parseFloat(numAnswer))) {
        report.warnings.push(`⚠️ 第${questionNum}题: 计算题答案非数字: "${q.answer}"`);
      }
    }
  });

  // 4. 统计信息
  report.stats.withSolution = questions.filter(q => q.solution).length;
  report.stats.withTip = questions.filter(q => q.tip).length;
  report.stats.avgContentLength = Math.round(
    questions.reduce((sum, q) => sum + (q.content?.length || 0), 0) / questions.length
  );

  return report;
}

/**
 * 打印质量报告
 * @param {object} report 质量检查报告
 * @param {string} testName 测试名称
 */
function printReport(report, testName) {
  console.log('\n========================================');
  console.log(`📋 测试: ${testName}`);
  console.log('========================================\n');

  if (report.passed) {
    console.log('✅ 质量检查通过!\n');
  } else {
    console.log('❌ 质量检查未通过!\n');
  }

  // 打印错误
  if (report.errors.length > 0) {
    console.log('【错误】');
    report.errors.forEach(e => console.log('  ' + e));
    console.log('');
  }

  // 打印警告
  if (report.warnings.length > 0) {
    console.log('【警告】');
    report.warnings.forEach(w => console.log('  ' + w));
    console.log('');
  }

  // 打印统计
  console.log('【统计】');
  console.log(`  生成题目数: ${report.stats.totalQuestions || 0}`);
  console.log(`  有解答过程: ${report.stats.withSolution || 0}`);
  console.log(`  有解题提示: ${report.stats.withTip || 0}`);
  console.log(`  平均题目长度: ${report.stats.avgContentLength || 0} 字符`);
}

// ==================== 导出测试函数 ====================

module.exports = {
  testCase1,
  testCase2,
  testCase3,
  checkQuality,
  printReport
};

// ==================== 使用说明 ====================
/*
【如何在微信开发者工具中测试】

方法一：本地调试（推荐）

1. 右键 cloudfunctions/generateQuestions 文件夹
2. 选择「开启云函数本地调试」
3. 在弹出的调试面板中：
   - 选择「本地调试」标签
   - 在「参数」输入框中粘贴测试用例，如：
     {
       "knowledgeName": "除数是小数的小数除法",
       "grade": "五年级",
       "count": 3,
       "difficulty": "medium",
       "questionType": "calculation"
     }
4. 点击「调用」按钮
5. 查看右侧「返回结果」

方法二：云端测试

1. 先上传并部署云函数
2. 在调试面板中选择「云端测试」标签
3. 输入参数，点击「调用」

【如何判断出题质量】

✅ 合格标准：
1. 成功生成指定数量的题目
2. 每道题都有题目内容、答案、解答过程
3. 答案正确且格式规范（计算题为数字）
4. 解答过程清晰，步骤完整
5. 有解题提示，帮助理解知识点

❌ 不合格情况：
1. 题目内容错误或与知识点无关
2. 答案错误
3. 解答过程缺失或错误
4. 数值超出年级范围（如五年级用三位数乘三位数）
5. 格式混乱，难以阅读

【测试检查清单】

□ 测试用例1：除数是小数的小数除法
  - 题目是否涉及小数除法？
  - 除数是否是小数？
  - 答案是否正确？

□ 测试用例2：解方程
  - 方程类型是否适合五年级？
  - 求解过程是否正确？

□ 测试用例3：三角形面积（填空题）
  - 是否是填空题格式？
  - 面积计算是否正确？
  - 难度是否为困难？
*/
