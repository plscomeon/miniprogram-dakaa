// 本地存储工具
class Storage {
  // 保存打卡记录
  static saveCheckinRecord(data) {
    try {
      const records = this.getCheckinRecords()
      const record = {
        id: Date.now().toString(),
        date: data.date,
        questions: data.questions || [],
        videoUrl: data.videoUrl || '',
        videoCover: data.videoCover || '',
        diary: data.diary || '',
        images: data.images || [],
        timestamp: Date.now()
      }
      
      // 检查是否已有当天记录
      const existingIndex = records.findIndex(r => r.date === data.date)
      if (existingIndex >= 0) {
        records[existingIndex] = record
      } else {
        records.push(record)
      }
      
      wx.setStorageSync('checkin_records', records)
      return { success: true, data: record }
    } catch (error) {
      console.error('保存打卡记录失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 获取所有打卡记录
  static getCheckinRecords() {
    try {
      return wx.getStorageSync('checkin_records') || []
    } catch (error) {
      console.error('获取打卡记录失败:', error)
      return []
    }
  }

  // 获取指定日期的打卡记录
  static getCheckinByDate(date) {
    try {
      const records = this.getCheckinRecords()
      return records.find(r => r.date === date) || null
    } catch (error) {
      console.error('获取指定日期记录失败:', error)
      return null
    }
  }

  // 获取统计数据
  static getStatistics() {
    try {
      const records = this.getCheckinRecords()
      const today = new Date()
      const todayStr = this.formatDate(today)
      
      // 计算连续天数
      let streakDays = 0
      let currentDate = new Date(today)
      
      while (true) {
        const dateStr = this.formatDate(currentDate)
        const hasRecord = records.some(r => r.date === dateStr)
        
        if (hasRecord) {
          streakDays++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
      }
      
      return {
        totalDays: records.length,
        streakDays: streakDays,
        totalQuestions: records.reduce((sum, r) => sum + (r.questions?.length || 0), 0),
        totalVideos: records.filter(r => r.videoUrl).length,
        totalDiaries: records.filter(r => r.diary).length,
        totalImages: records.reduce((sum, r) => sum + (r.images?.length || 0), 0)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return {
        totalDays: 0,
        streakDays: 0,
        totalQuestions: 0,
        totalVideos: 0,
        totalDiaries: 0,
        totalImages: 0
      }
    }
  }

  // 格式化日期
  static formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 保存用户信息
  static saveUserInfo(userInfo) {
    try {
      wx.setStorageSync('userInfo', userInfo)
      return { success: true }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 获取用户信息
  static getUserInfo() {
    try {
      return wx.getStorageSync('userInfo') || {
        nickName: '学习者',
        avatarUrl: '/images/default-avatar.png'
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return {
        nickName: '学习者',
        avatarUrl: '/images/default-avatar.png'
      }
    }
  }

  // 清除所有数据
  static clearAll() {
    try {
      wx.clearStorageSync()
      return { success: true }
    } catch (error) {
      console.error('清除数据失败:', error)
      return { success: false, error: error.message }
    }
  }
}

module.exports = Storage