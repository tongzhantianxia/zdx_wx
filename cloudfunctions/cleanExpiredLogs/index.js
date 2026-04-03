const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const MAX_BATCH = 100;

exports.main = async (event, context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;
  let totalDoneUpdated = 0;

  let hasMore = true;
  while (hasMore) {
    const expiredLogs = await db.collection('user_question_log')
      .where({ servedAt: _.lt(thirtyDaysAgo) })
      .limit(MAX_BATCH)
      .get();

    if (expiredLogs.data.length === 0) {
      hasMore = false;
      break;
    }

    const groupMap = {};
    const idsToDelete = [];

    for (const log of expiredLogs.data) {
      idsToDelete.push(log._id);
      if (log.questionId) {
        const key = `${log.openid}|${log.knowledgeId}`;
        if (!groupMap[key]) groupMap[key] = { openid: log.openid, knowledgeId: log.knowledgeId, ids: [] };
        groupMap[key].ids.push(log.questionId);
      }
    }

    for (const group of Object.values(groupMap)) {
      try {
        await db.collection('user_knowledge_done')
          .where({ openid: group.openid, knowledgeId: group.knowledgeId })
          .update({ data: { doneQuestionIds: _.pullAll(group.ids), lastUpdated: new Date() } });
        totalDoneUpdated++;
      } catch (e) {
        console.error('[clean] pullAll error:', e.message);
      }
    }

    for (const id of idsToDelete) {
      try {
        await db.collection('user_question_log').doc(id).remove();
        totalDeleted++;
      } catch (e) {
        console.error('[clean] remove error:', e.message);
      }
    }

    if (expiredLogs.data.length < MAX_BATCH) hasMore = false;
  }

  let ocrDeleted = 0;
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ocrFiles = await db.collection('ocr_uploads')
      .where({ uploadedAt: _.lt(sevenDaysAgo) })
      .limit(MAX_BATCH)
      .get();

    for (const file of ocrFiles.data) {
      try {
        await cloud.deleteFile({ fileList: [file.fileID] });
        await db.collection('ocr_uploads').doc(file._id).remove();
        ocrDeleted++;
      } catch (e) {
        console.error('[clean] OCR file delete error:', e.message);
      }
    }
  } catch (e) {
    console.error('[clean] OCR cleanup error:', e.message);
  }

  const result = { totalDeleted, totalDoneUpdated, ocrDeleted, cleanedAt: new Date().toISOString() };
  console.log('[cleanExpiredLogs] done:', JSON.stringify(result));
  return result;
};
