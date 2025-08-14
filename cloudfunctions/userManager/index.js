// 用户管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  try {
    switch (action) {
      case 'saveUserInfo':
        return await saveUserInfo(OPENID, data)
      case 'getUserInfo':
        return await getUserInfo(OPENID)
      case 'updateUserInfo':
        return await updateUserInfo(OPENID, data)
      case 'login':
        return await login(OPENID, data)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return { success: false, message: error.message }
  }
}

// 保存用户信息
async function saveUserInfo(openid, userInfo) {
  try {
    const now = new Date()
    
    // 检查用户是否已存在
    const existingUser = await db.collection('users').where({
      _openid: openid
    }).get()

    if (existingUser.data.length > 0) {
      // 更新现有用户信息
      const updateResult = await db.collection('users').doc(existingUser.data[0]._id).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          updateTime: now
        }
      })
      
      return {
        success: true,
        message: '用户信息更新成功',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          updateTime: now
        }
      }
    } else {
      // 创建新用户
      const addResult = await db.collection('users').add({
        data: {
          _openid: openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: now,
          updateTime: now
        }
      })
      
      return {
        success: true,
        message: '用户信息保存成功',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: now,
          updateTime: now
        }
      }
    }
  } catch (error) {
    console.error('保存用户信息失败:', error)
    return { success: false, message: '保存用户信息失败' }
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  try {
    const result = await db.collection('users').where({
      _openid: openid
    }).get()

    if (result.data.length > 0) {
      const userInfo = result.data[0]
      return {
        success: true,
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: userInfo.createTime,
          updateTime: userInfo.updateTime
        }
      }
    } else {
      return {
        success: false,
        message: '用户信息不存在'
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return { success: false, message: '获取用户信息失败' }
  }
}

// 登录处理
async function login(openid, data) {
  try {
    const { code, userInfo } = data
    
    // 保存用户信息
    const saveResult = await saveUserInfo(openid, userInfo)
    
    if (saveResult.success) {
      return {
        success: true,
        data: {
          openid: openid,
          userInfo: saveResult.data
        },
        message: '登录成功'
      }
    } else {
      return saveResult
    }
  } catch (error) {
    console.error('登录失败:', error)
    return { success: false, message: '登录失败: ' + error.message }
  }
}

// 更新用户信息
async function updateUserInfo(openid, updateData) {
  try {
    const result = await db.collection('users').where({
      _openid: openid
    }).update({
      data: {
        ...updateData,
        updateTime: new Date()
      }
    })

    return {
      success: true,
      message: '用户信息更新成功',
      data: updateData
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return { success: false, message: '更新用户信息失败' }
  }
}