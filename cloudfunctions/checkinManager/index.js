// 打卡记录管理云函数
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
      case 'saveCheckin':
        return await saveCheckin(openid, data)
      case 'getCheckinRecords':
        return await getCheckinRecords(openid, data)
      case 'getCheckinByDate':
        return await getCheckinByDate(openid, data.date)
      case 'updateCheckin':
        return await updateCheckin(openid, data)
      case 'deleteCheckin':
        return await deleteCheckin(openid, data.id)
      case 'getStats':
        return await getStats(openid)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('打卡管理云函数错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 保存打卡记录
async function saveCheckin(openid, checkinData) {
  const checkinCollection = db.collection('checkins')
  const today = new Date().toISOString().split('T')[0]
  
  // 检查今天是否已经打卡
  const existingCheckin = await checkinCollection.where({
    _openid: openid,
    date: today
  }).get()

  if (existingCheckin.data.length > 0) {
    // 更新今天的打卡记录
    await checkinCollection.doc(existingCheckin.data[0]._id).update({
      data: {
        ...checkinData,
        updatedAt: new Date()
      }
    })
    return {
      success: true,
      message: '今日打卡记录更新成功'
    }
  } else {
    // 创建新的打卡记录
    await checkinCollection.add({
      data: {
        _openid: openid,
        date: today,
        ...checkinData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    return {
      success: true,
      message: '打卡成功'
    }
  }
}

// 获取打卡记录
async function getCheckinRecords(openid, params = {}) {
  const checkinCollection = db.collection('checkins')
  let query = checkinCollection.where({
    _openid: openid
  })

  // 如果有日期范围参数
  if (params.startDate && params.endDate) {
    query = query.where({
      date: db.command.gte(params.startDate).and(db.command.lte(params.endDate))
    })
  }

  const result = await query.orderBy('date', 'desc').get()

  return {
    success: true,
    data: result.data
  }
}

// 根据日期获取打卡记录
async function getCheckinByDate(openid, date) {
  const checkinCollection = db.collection('checkins')
  
  const result = await checkinCollection.where({
    _openid: openid,
    date: date
  }).get()

  if (result.data.length > 0) {
    return {
      success: true,
      data: result.data[0]
    }
  } else {
    return {
      success: false,
      message: '该日期没有打卡记录'
    }
  }
}

// 更新打卡记录
async function updateCheckin(openid, updateData) {
  const checkinCollection = db.collection('checkins')
  
  const result = await checkinCollection.doc(updateData.id).update({
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  })

  return {
    success: true,
    message: '打卡记录更新成功',
    data: result
  }
}

// 删除打卡记录
async function deleteCheckin(openid, checkinId) {
  const checkinCollection = db.collection('checkins')
  
  await checkinCollection.doc(checkinId).remove()

  return {
    success: true,
    message: '打卡记录删除成功'
  }
}

// 获取统计数据
async function getStats(openid) {
  const checkinCollection = db.collection('checkins')
  
  // 获取所有打卡记录
  const allRecords = await checkinCollection.where({
    _openid: openid
  }).orderBy('date', 'asc').get()

  const records = allRecords.data
  const totalDays = records.length

  // 计算连续天数
  let consecutiveDays = 0
  if (records.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    let currentDate = new Date(today)
    
    for (let i = records.length - 1; i >= 0; i--) {
      const recordDate = records[i].date
      const expectedDate = currentDate.toISOString().split('T')[0]
      
      if (recordDate === expectedDate) {
        consecutiveDays++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  // 计算本月天数
  const now = new Date()
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const monthlyDays = records.filter(record => 
    record.date.startsWith(currentMonth)
  ).length

  // 计算其他统计数据
  let totalQuestions = 0
  let totalVideos = 0
  let totalDiaries = 0
  let totalImages = 0

  records.forEach(record => {
    if (record.questions) totalQuestions += record.questions.length
    if (record.videoInfo && record.videoInfo.path) totalVideos++
    if (record.diary && record.diary.content) totalDiaries++
    if (record.diary && record.diary.images) totalImages += record.diary.images.length
  })

  return {
    success: true,
    data: {
      totalDays,
      consecutiveDays,
      monthlyDays,
      totalQuestions,
      totalVideos,
      totalDiaries,
      totalImages
    }
  }
}