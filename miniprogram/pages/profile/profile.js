// 个人中心页面逻辑
const Storage = require('../../utils/storage.js')

Page({
  data: {
    userInfo: {},
    totalDays: 0,
    streakDays: 0,
    totalVideos: 0,
    totalWords: 0,
    achievements: [],
    totalAchievements: 8,
    unlockedCount: 0,
    reminderEnabled: true,
    syncEnabled: false,
    showExportModal: false,
    exportType: 'excel',
    dateRange: 'month',
    cacheSize: '0KB'
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.loadUserData()
  },

  // 初始化页面
  initPage() {
    this.getUserInfo()
    this.loadSettings()
    this.calculateCacheSize()
    this.initAchievements()
  },

  // 获取用户信息
  getUserInfo() {
    try {
      const userInfo = Storage.getUserInfo()
      this.setData({ userInfo })
    } catch (error) {
      console.error('获取用户信息失败:', error)
      this.setData({
        userInfo: {
          nickName: '学习者',
          avatarUrl: '/images/default-avatar.png'
        }
      })
    }
  },

  // 加载用户数据 - 使用API方式获取真实数据
  loadUserData() {
    wx.showLoading({ title: '加载数据中...' })
    
    try {
      // 获取所有打卡记录
      const allRecords = Storage.getCheckinRecords()
      console.log('获取到的打卡记录:', allRecords)
      
      if (!allRecords || allRecords.length === 0) {
        // 没有数据时设置默认值
        this.setData({
          totalDays: 0,
          streakDays: 0,
          totalVideos: 0,
          totalWords: 0
        })
        wx.hideLoading()
        this.updateAchievements()
        return
      }
      
      // 计算统计数据
      const stats = this.calculateRealStatistics(allRecords)
      console.log('计算出的统计数据:', stats)
      
      this.setData({
        totalDays: stats.totalDays,
        streakDays: stats.continuousDays,
        totalVideos: stats.totalVideos,
        totalWords: stats.totalWords
      })
      
      wx.hideLoading()
      // 更新成就进度
      this.updateAchievements()
    } catch (error) {
      console.error('加载用户数据失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    }
  },

  // 计算真实的统计数据
  calculateRealStatistics(records) {
    if (!records || records.length === 0) {
      return {
        totalDays: 0,
        continuousDays: 0,
        totalVideos: 0,
        totalWords: 0
      }
    }

    let totalDays = records.length
    let totalVideos = 0
    let totalWords = 0

    // 遍历所有记录计算统计数据
    records.forEach(record => {
      // 统计视频数量
      if (record.videoUrl) {
        totalVideos++
      }

      // 统计字数
      if (record.diary) {
        totalWords += record.diary.length
      }

      // 统计问题字数
      if (record.questions && Array.isArray(record.questions)) {
        record.questions.forEach(q => {
          if (q && typeof q === 'string') {
            totalWords += q.length
          }
        })
      }
    })

    // 计算连续天数
    const continuousDays = this.calculateContinuousDays(records)

    return {
      totalDays,
      continuousDays,
      totalVideos,
      totalWords
    }
  },

  // 计算连续天数
  calculateContinuousDays(records) {
    if (!records || records.length === 0) return 0

    // 按日期排序（最新的在前）
    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    let continuousDays = 0
    const today = new Date()
    let checkDate = new Date(today)

    // 从今天开始往前检查连续天数
    for (let i = 0; i < sortedRecords.length; i++) {
      const recordDate = new Date(sortedRecords[i].date)
      const checkDateStr = checkDate.toISOString().split('T')[0]
      const recordDateStr = recordDate.toISOString().split('T')[0]

      if (recordDateStr === checkDateStr) {
        continuousDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        // 如果不连续，检查是否是第一天就不连续
        if (i === 0) {
          // 第一条记录就不是今天，检查是否是昨天
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          
          if (recordDateStr === yesterdayStr) {
            continuousDays++
            checkDate = new Date(yesterday)
            checkDate.setDate(checkDate.getDate() - 1)
            continue
          }
        }
        break
      }
    }

    return continuousDays
  },

  // 初始化成就系统
  initAchievements() {
    const achievements = [
      {
        id: 1,
        name: '初学者',
        description: '完成第一次打卡',
        icon: '🌱',
        target: 1,
        progress: 0,
        unlocked: false
      },
      {
        id: 2,
        name: '坚持者',
        description: '连续打卡7天',
        icon: '🔥',
        target: 7,
        progress: 0,
        unlocked: false
      },
      {
        id: 3,
        name: '学习达人',
        description: '累计打卡30天',
        icon: '⭐',
        target: 30,
        progress: 0,
        unlocked: false
      },
      {
        id: 4,
        name: '视频专家',
        description: '上传10个学习视频',
        icon: '🎬',
        target: 10,
        progress: 0,
        unlocked: false
      },
      {
        id: 5,
        name: '文字记录者',
        description: '累计记录10000字',
        icon: '📝',
        target: 10000,
        progress: 0,
        unlocked: false
      },
      {
        id: 6,
        name: '百日学者',
        description: '累计打卡100天',
        icon: '🏆',
        target: 100,
        progress: 0,
        unlocked: false
      },
      {
        id: 7,
        name: '月度冠军',
        description: '单月打卡30天',
        icon: '👑',
        target: 30,
        progress: 0,
        unlocked: false
      },
      {
        id: 8,
        name: '学习大师',
        description: '连续打卡100天',
        icon: '🎓',
        target: 100,
        progress: 0,
        unlocked: false
      }
    ]
    
    this.setData({ achievements })
  },

  // 更新成就进度
  updateAchievements() {
    const { totalDays, streakDays, totalVideos, totalWords } = this.data
    const achievements = this.data.achievements.map(achievement => {
      let progress = 0
      
      switch (achievement.id) {
        case 1: // 初学者
          progress = totalDays
          break
        case 2: // 坚持者
          progress = streakDays
          break
        case 3: // 学习达人
          progress = totalDays
          break
        case 4: // 视频专家
          progress = totalVideos
          break
        case 5: // 文字记录者
          progress = totalWords
          break
        case 6: // 百日学者
          progress = totalDays
          break
        case 7: // 月度冠军
          progress = this.getMonthlyDays()
          break
        case 8: // 学习大师
          progress = streakDays
          break
      }
      
      return {
        ...achievement,
        progress: Math.min(progress, achievement.target),
        unlocked: progress >= achievement.target
      }
    })
    
    // 计算已解锁成就数量
    const unlockedCount = achievements.filter(item => item.unlocked).length
    
    this.setData({ 
      achievements,
      unlockedCount
    })
  },

  // 获取本月打卡天数
  getMonthlyDays() {
    try {
      const records = Storage.getCheckinRecords()
      if (!records || records.length === 0) return 0
      
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      return records.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear
      }).length
    } catch (error) {
      console.error('获取本月打卡天数失败:', error)
      return 0
    }
  },

  // 加载设置
  loadSettings() {
    try {
      const reminderEnabled = wx.getStorageSync('reminderEnabled') !== false
      const syncEnabled = wx.getStorageSync('syncEnabled') === true
      this.setData({ reminderEnabled, syncEnabled })
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync()
      const sizeKB = Math.round(info.currentSize)
      let cacheSize = ''
      if (sizeKB < 1024) {
        cacheSize = `${sizeKB}KB`
      } else {
        cacheSize = `${(sizeKB / 1024).toFixed(1)}MB`
      }
      this.setData({ cacheSize })
    } catch (error) {
      this.setData({ cacheSize: '未知' })
    }
  },

  // 更换头像
  changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.updateAvatar(tempFilePath)
      },
      fail: (error) => {
        console.error('选择头像失败:', error)
        wx.showToast({
          title: '选择头像失败',
          icon: 'error'
        })
      }
    })
  },

  // 更新头像
  updateAvatar(filePath) {
    try {
      const userInfo = { ...this.data.userInfo, avatarUrl: filePath }
      this.setData({ userInfo })
      
      // 保存到本地存储
      Storage.saveUserInfo(userInfo)
      
      // 更新全局用户信息
      const app = getApp()
      app.setUserInfo(userInfo)
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('更新头像失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      })
    }
  },

  // 导出数据
  exportData() {
    this.setData({ showExportModal: true })
  },

  hideExportModal() {
    this.setData({ showExportModal: false })
  },

  // 选择导出类型
  selectExportType(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ exportType: type })
  },

  // 选择日期范围
  selectDateRange(e) {
    const { range } = e.currentTarget.dataset
    this.setData({ dateRange: range })
  },

  // 确认导出
  confirmExport() {
    wx.showLoading({ title: '生成中...' })
    
    try {
      const { exportType, dateRange } = this.data
      const records = Storage.getCheckinRecords()
      
      // 根据日期范围筛选数据
      let filteredRecords = records
      const now = new Date()
      
      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filteredRecords = records.filter(record => new Date(record.date) >= weekAgo)
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filteredRecords = records.filter(record => new Date(record.date) >= monthAgo)
      }
      
      // 生成导出数据
      const exportData = this.generateExportData(filteredRecords, exportType)
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: exportData,
        success: () => {
          wx.hideLoading()
          this.hideExportModal()
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success'
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({
            title: '导出失败',
            icon: 'error'
          })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('导出数据失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      })
     }
  },

  // 生成导出数据
  generateExportData(records, format) {
    if (format === 'excel') {
      // CSV格式
      let csv = '日期,预习问题,视频数量,学习日记,图片数量\n'
      records.forEach(record => {
        const questions = record.questions ? record.questions.join(';') : ''
        const videoCount = record.video ? 1 : 0
        const diary = record.diary || ''
        const imageCount = record.images ? record.images.length : 0
        csv += `${record.date},"${questions}",${videoCount},"${diary}",${imageCount}\n`
      })
      return csv
    } else {
      // PDF格式（文本）
      let text = '学习打卡记录\n\n'
      records.forEach(record => {
        text += `日期: ${record.date}\n`
        if (record.questions && record.questions.length > 0) {
          text += `预习问题:\n${record.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
        }
        if (record.video) {
          text += `学习视频: 已上传\n`
        }
        if (record.diary) {
          text += `学习日记: ${record.diary}\n`
        }
        if (record.images && record.images.length > 0) {
          text += `图片数量: ${record.images.length}张\n`
        }
        text += '\n---\n\n'
      })
      return text
    }
  },

  // 提醒开关变化
  toggleReminder(e) {
    const enabled = e.detail.value
    this.setData({ reminderEnabled: enabled })
    wx.setStorageSync('reminderEnabled', enabled)
    
    wx.showToast({
      title: enabled ? '提醒已开启' : '提醒已关闭',
      icon: 'success'
    })
  },

  // 同步开关变化
  toggleSync(e) {
    const enabled = e.detail.value
    this.setData({ syncEnabled: enabled })
    wx.setStorageSync('syncEnabled', enabled)
    
    wx.showToast({
      title: enabled ? '同步已开启' : '同步已关闭',
      icon: 'success'
    })
  },

  // 分享应用
  shareApp() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 意见反馈
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '感谢您的使用！如有建议或问题，请通过微信联系我们。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 关于我们
  about() {
    wx.showModal({
      title: '关于Learning Tracker',
      content: 'Learning Tracker是一款专注于学习打卡的小程序，帮助您养成良好的学习习惯。\n\n版本: 1.0.0\n开发者: Learning Team',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: 'Learning Tracker - 我的学习打卡记录',
      path: '/pages/checkin/checkin',
      imageUrl: '/images/default-avatar.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'Learning Tracker - 坚持学习，每天进步',
      imageUrl: '/images/default-avatar.png'
    }
  }
})