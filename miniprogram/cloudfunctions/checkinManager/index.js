// 打卡记录管理云函数
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
      case 'saveCheckin':
        return await saveCheckin(OPENID, data)
      case 'getCheckinRecords':
        return await getCheckinRecords(OPENID, data)
      case 'getCheckinByDate':
        return await getCheckinByDate(OPENID, data)
      case 'updateCheckin':
        return await updateCheckin(OPENID, data)
      case 'deleteCheckin':
        return await deleteCheckin(OPENID, data)
      case 'getStats':
        return await getStats(OPENID)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return { success: false, message: error.message }
  }
}

// 保存打卡记录
async function saveCheckin(openid, checkinData) {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD格式

    // 检查今日是否已有记录
    const existingRecord = await db.collection('checkins').where({
      _openid: openid,
      date: today
    }).get()

    const data = {
      _openid: openid,
      date: today,
      questions: checkinData.questions || [],
      videoUrl: checkinData.videoUrl || '',
      videoCover: checkinData.videoCover || '',
      diary: checkinData.diary || '',
      images: checkinData.images || [],
      createTime: now,
      updateTime: now
    }

    if (existingRecord.data.length > 0) {
      // 更新今日记录
      await db.collection('checkins').doc(existingRecord.data[0]._id).update({
        data: {
          questions: data.questions,
          videoUrl: data.videoUrl,
          videoCover: data.videoCover,
          diary: data.diary,
          images: data.images,
          updateTime: now
        }
      })
    } else {
      // 创建新记录
      await db.collection('checkins').add({ data })
    }

    return {
      success: true,
      message: '打卡记录保存成功',
      data: { date: today }
    }
  } catch (error) {
    console.error('保存打卡记录失败:', error)
    return { success: false, message: '保存打卡记录失败' }
  }
}

// 获取打卡记录列表
async function getCheckinRecords(openid, params = {}) {
  try {
    const { limit = 20, skip = 0, startDate, endDate } = params
    
    let query = db.collection('checkins').where({
      _openid: openid
    })

    // 日期范围筛选
    if (startDate && endDate) {
      query = query.where({
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
    }

    const result = await query
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    return {
      success: true,
      data: result.data,
      total: result.data.length
    }
  } catch (error) {
    console.error('获取打卡记录失败:', error)
    return { success: false, message: '获取打卡记录失败' }
  }
}

// 获取指定日期的打卡记录
async function getCheckinByDate(openid, { date }) {
  try {
    const result = await db.collection('checkins').where({
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
  } catch (error) {
    console.error('获取指定日期打卡记录失败:', error)
    return { success: false, message: '获取指定日期打卡记录失败' }
  }
}

// 更新打卡记录
async function updateCheckin(openid, updateData) {
  try {
    const { id, ...data } = updateData
    
    await db.collection('checkins').doc(id).update({
      data: {
        ...data,
        updateTime: new Date()
      }
    })

    return {
      success: true,
      message: '打卡记录更新成功'
    }
  } catch (error) {
    console.error('更新打卡记录失败:', error)
    return { success: false, message: '更新打卡记录失败' }
  }
}

// 删除打卡记录
async function deleteCheckin(openid, { id }) {
  try {
    await db.collection('checkins').doc(id).remove()

    return {
      success: true,
      message: '打卡记录删除成功'
    }
  } catch (error) {
    console.error('删除打卡记录失败:', error)
    return { success: false, message: '删除打卡记录失败' }
  }
}

// 获取统计数据
async function getStats(openid) {
  try {
    // 获取所有打卡记录
    const allRecords = await db.collection('checkins').where({
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
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthlyRecords = records.filter(record => record.date.startsWith(currentMonth))

    // 统计内容数量
    let totalQuestions = 0
    let totalVideos = 0
    let totalImages = 0
    let totalDiaryWords = 0

    records.forEach(record => {
      totalQuestions += (record.questions || []).length
      if (record.videoUrl) totalVideos++
      totalImages += (record.images || []).length
      totalDiaryWords += (record.diary || '').length
    })

    return {
      success: true,
      data: {
        totalDays,
        consecutiveDays,
        monthlyDays: monthlyRecords.length,
        totalQuestions,
        totalVideos,
        totalImages,
        totalDiaryWords
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return { success: false, message: '获取统计数据失败' }
  }
}