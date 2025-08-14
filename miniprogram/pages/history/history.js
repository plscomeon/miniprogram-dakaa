// 打卡记录页面逻辑
const CloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    // 统计数据
    totalDays: 0,
    streakDays: 0,
    monthDays: 0,
    
    // 日历相关
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    
    // 记录相关
    records: [],
    selectedRecord: null,
    
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    // 每次显示页面时检查登录状态并加载数据
    this.checkLoginAndLoadData()
  },

  // 初始化页面
  initPage() {
    this.generateCalendar()
    this.checkLoginAndLoadData()
  },

  // 检查登录状态并加载数据
  checkLoginAndLoadData() {
    const app = getApp()
    const userInfo = app.getValidUserInfo()
    
    if (!userInfo || !userInfo.nickName || userInfo.nickName === '未登录') {
      console.log('History页面：用户未登录，显示空数据')
      this.setData({
        totalDays: 0,
        streakDays: 0,
        monthDays: 0,
        records: []
      })
      this.generateCalendar() // 重新生成空日历
      
      // 显示登录提示
      wx.showModal({
        title: '需要登录',
        content: '查看打卡记录需要先登录，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/checkin/checkin'
            })
          }
        }
      })
      return
    }
    
    console.log('History页面：用户已登录，加载数据')
    this.loadData()
  },

  // 加载数据
  loadData() {
    this.loadStatistics()
    this.loadRecords()
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      // 检查用户登录状态
      const app = getApp()
      const userInfo = app.getValidUserInfo()
      
      if (!userInfo || !userInfo.nickName || userInfo.nickName === '未登录') {
        console.log('History页面：用户未登录，跳过统计数据加载')
        this.setData({
          totalDays: 0,
          streakDays: 0,
          monthDays: 0
        })
        return
      }

      const result = await CloudApi.getStats()
      if (result.success) {
        const stats = result.data
        this.setData({
          totalDays: stats.totalDays || 0,
          streakDays: stats.consecutiveDays || 0,
          monthDays: stats.monthlyDays || 0
        })
      } else {
        // 如果获取失败，设置为0
        this.setData({
          totalDays: 0,
          streakDays: 0,
          monthDays: 0
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      this.setData({
        totalDays: 0,
        streakDays: 0,
        monthDays: 0
      })
    }
  },

  // 加载记录列表
  async loadRecords() {
    try {
      // 检查用户登录状态
      const app = getApp()
      const userInfo = app.getValidUserInfo()
      
      if (!userInfo || !userInfo.nickName || userInfo.nickName === '未登录') {
        console.log('History页面：用户未登录，跳过记录加载')
        this.setData({ records: [] })
        this.generateCalendar()
        return
      }

      const { currentYear, currentMonth } = this.data
      
      // 获取当前月份的记录（只获取当前用户的记录）
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`
      
      const result = await CloudApi.getCheckinRecords({
        startDate,
        endDate
      })
      
      if (result.success) {
        // 注意：CloudApi.getCheckinRecords 应该已经在云函数中过滤了当前用户的记录
        // 如果没有过滤，这里会显示所有用户的记录，这是需要修复的问题
        const allRecords = result.data
        
        // 格式化记录数据
        const formattedRecords = allRecords.map(record => {
          const date = new Date(record.date)
          const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
          
          // 生成摘要
          let summary = ''
          if (record.questions && record.questions.length > 0) {
            summary += `${record.questions.length}个问题`
          }
          if (record.videoUrl) {
            summary += summary ? '，视频讲解' : '视频讲解'
          }
          if (record.diary) {
            const diaryPreview = record.diary.length > 20 ? 
              record.diary.substring(0, 20) + '...' : record.diary
            summary += summary ? `，${diaryPreview}` : diaryPreview
          }
          
          return {
            id: record._id,
            date: record.date,
            dayOfWeek,
            preview: record.questions && record.questions.length > 0,
            video: !!record.videoUrl,
            diary: !!record.diary,
            summary: summary || '打卡记录'
          }
        })
        
        this.setData({ records: formattedRecords })
        this.generateCalendar() // 重新生成日历以显示打卡标记
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      wx.showToast({
        title: '加载记录失败',
        icon: 'error'
      })
    }
  },

  // 生成日历数据
  generateCalendar() {
    const { currentYear, currentMonth, records } = this.data
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()
    
    const calendarDays = []
    
    // 填充上月末尾日期
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate()
    
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      calendarDays.push({
        day,
        date,
        isOtherMonth: true,
        isToday: false,
        hasRecord: false
      })
    }
    
    // 填充当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = this.isToday(currentYear, currentMonth - 1, day)
      const hasRecord = records.some(record => record.date === date)
      
      calendarDays.push({
        day,
        date,
        isOtherMonth: false,
        isToday,
        hasRecord
      })
    }
    
    // 填充下月开头日期
    const remainingDays = 42 - calendarDays.length // 6行 * 7天
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      calendarDays.push({
        day,
        date,
        isOtherMonth: true,
        isToday: false,
        hasRecord: false
      })
    }
    
    this.setData({ calendarDays })
  },

  // 判断是否为今天
  isToday(year, month, day) {
    const today = new Date()
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate()
  },

  // 选择日期
  selectDate(e) {
    const { date } = e.currentTarget.dataset
    if (!date) return
    
    // 查找该日期的记录
    const record = this.data.records.find(r => r.date === date)
    if (!record) {
      wx.showToast({
        title: '该日期无打卡记录',
        icon: 'none'
      })
      return
    }
    
    this.viewRecord({ currentTarget: { dataset: { id: record.id } } })
  },

  // 查看记录详情
  viewRecord(e) {
    const { id } = e.currentTarget.dataset
    // 跳转到记录详情页面
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?id=${id}`
    })
  },

  // 上一月
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }
    this.setData({ 
      currentYear, 
      currentMonth
    })
    this.loadRecords()
  },

  // 下一月
  nextMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ 
      currentYear, 
      currentMonth
    })
    this.loadRecords()
  },

  // 页面级别的用户信息更新方法（由app.js调用）
  updateUserInfo(userInfo) {
    console.log('History页面：收到用户信息更新通知:', userInfo);
    
    if (userInfo === null) {
      // 用户退出登录，清空数据
      console.log('History页面：用户已退出登录，清空数据');
      this.setData({
        totalDays: 0,
        streakDays: 0,
        monthDays: 0,
        records: []
      });
      this.generateCalendar(); // 重新生成空日历
    } else if (userInfo && userInfo.nickName && userInfo.nickName !== '微信用户' && userInfo.nickName !== '未登录') {
      // 用户登录，重新加载数据
      console.log('History页面：用户已登录，重新加载数据');
      this.loadData();
    }
  }

})