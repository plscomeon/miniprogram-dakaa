// 用户管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'saveUserInfo':
        return await saveUserInfo(openid, data)
      case 'getUserInfo':
        return await getUserInfo(openid)
      case 'updateUserInfo':
        return await updateUserInfo(openid, data)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('用户管理云函数错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 保存用户信息
async function saveUserInfo(openid, userInfo) {
  const userCollection = db.collection('users')
  
  // 检查用户是否已存在
  const existingUser = await userCollection.where({
    _openid: openid
  }).get()

  if (existingUser.data.length > 0) {
    // 更新现有用户
    await userCollection.doc(existingUser.data[0]._id).update({
      data: {
        ...userInfo,
        updatedAt: new Date()
      }
    })
  } else {
    // 创建新用户
    await userCollection.add({
      data: {
        _openid: openid,
        ...userInfo,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  return {
    success: true,
    message: '用户信息保存成功'
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  const userCollection = db.collection('users')
  
  const result = await userCollection.where({
    _openid: openid
  }).get()

  if (result.data.length > 0) {
    return {
      success: true,
      data: result.data[0]
    }
  } else {
    return {
      success: false,
      message: '用户不存在'
    }
  }
}

// 更新用户信息
async function updateUserInfo(openid, updateData) {
  const userCollection = db.collection('users')
  
  const result = await userCollection.where({
    _openid: openid
  }).update({
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    message: '用户信息更新成功',
    data: result
  }
}