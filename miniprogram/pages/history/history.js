// 打卡记录页面逻辑
const Storage = require('../../utils/storage.js')

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
    // 检查全局登录状态
    const app = getApp()
    if (!app.isUserLoggedIn()) {
      console.log('用户未登录，显示空数据')
      // 可以选择跳转到登录页面或显示提示
      wx.showToast({
        title: '请先完善个人信息',
        icon: 'none',
        duration: 2000
      })
    }
    
    this.initPage()
  },

  onShow() {
    // 每次显示页面时重新加载数据，确保显示最新的用户数据
    this.loadData()
  },

  // 初始化页面
  initPage() {
    this.generateCalendar()
    this.loadData()
  },

  // 加载数据
  loadData() {
    this.loadStatistics()
    this.loadRecords()
  },

  // 加载统计数据
  loadStatistics() {
    try {
      const stats = Storage.getStatistics()
      
      // 计算本月天数
      const { currentYear, currentMonth } = this.data
      const allRecords = Storage.getCheckinRecords()
      const monthRecords = allRecords.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getFullYear() === currentYear && 
               recordDate.getMonth() + 1 === currentMonth
      })
      
      this.setData({
        totalDays: stats.totalDays,
        streakDays: stats.streakDays,
        monthDays: monthRecords.length
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 加载记录列表
  loadRecords() {
    try {
      const { currentYear, currentMonth } = this.data
      const allRecords = Storage.getCheckinRecords()
      
      // 筛选当前月份的记录
      const monthRecords = allRecords.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getFullYear() === currentYear && 
               recordDate.getMonth() + 1 === currentMonth
      })
      
      // 格式化记录数据
      const formattedRecords = monthRecords.map(record => {
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
          id: record.id,
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
    try {
      const allRecords = Storage.getCheckinRecords()
      const record = allRecords.find(r => r.id === id)
      if (record) {
        // 跳转到记录详情页面
        wx.navigateTo({
          url: `/pages/record-detail/record-detail?id=${id}`
        })
      } else {
        wx.showToast({
          title: '记录不存在',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('查看记录失败:', error)
      wx.showToast({
        title: '查看记录失败',
        icon: 'error'
      })
    }
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

})