// cloudfunctions/mistakesManager/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (event.action) {
    case 'add':
      return await db.collection('mistakes').add({
        data: {
          openid,
          content: event.content,
          date: new Date(),
        }
      });
    case 'get':
      return await db.collection('mistakes').where({ openid }).orderBy('date', 'desc').get();
    default:
      return;
  }
};