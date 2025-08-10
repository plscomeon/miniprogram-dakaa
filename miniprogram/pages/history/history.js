// 历史记录页面逻辑
const app = getApp()

Page({
  data: {
    userInfo: {},
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarData: [],
    checkInDates: [],
    selectedDate: '',
    selectedRecord: null,
    loading: false,
    searchKeyword: '',
    showSearchResults: false,
    searchResults: []
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.loadCheckInData()
  },

  // 初始化页面
  initPage() {
    this.getUserInfo()
    this.generateCalendar()
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({ userInfo })
  },

  // 生成日历数据
  generateCalendar() {
    const { currentYear, currentMonth } = this.data
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()
    
    const calendarData = []
    let week = []
    
    // 填充月初空白
    for (let i = 0; i < startWeekday; i++) {
      week.push({ day: '', isEmpty: true })
    }
    
    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasCheckIn = this.data.checkInDates.includes(dateStr)
      
      week.push({
        day,
        dateStr,
        hasCheckIn,
        isToday: this.isToday(currentYear, currentMonth - 1, day)
      })
      
      if (week.length === 7) {
        calendarData.push(week)
        week = []
      }
    }
    
    // 填充月末空白
    while (week.length < 7 && week.length > 0) {
      week.push({ day: '', isEmpty: true })
    }
    if (week.length > 0) {
      calendarData.push(week)
    }
    
    this.setData({ calendarData })
  },

  // 判断是否为今天
  isToday(year, month, day) {
    const today = new Date()
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate()
  },

  // 加载打卡数据
  loadCheckInData() {
    const { currentYear, currentMonth } = this.data
    
    // 先从缓存获取
    const cacheKey = `checkin_${currentYear}_${currentMonth}`
    const cached = wx.getStorageSync(cacheKey)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      this.setData({ checkInDates: cached.dates })
      this.generateCalendar()
      return
    }

    wx.request({
      url: `${app.globalData.apiBase}/checkin/list`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: {
        year: currentYear,
        month: currentMonth
      },
      success: (res) => {
        if (res.data.success) {
          const dates = res.data.data.map(item => item.date)
          this.setData({ checkInDates: dates })
          this.generateCalendar()
          
          // 缓存数据
          wx.setStorageSync(cacheKey, {
            dates,
            timestamp: Date.now()
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    })
  },

  // 日期选择
  onDateSelect(e) {
    const { date } = e.currentTarget.dataset
    if (!date) return
    
    const hasCheckIn = this.data.checkInDates.includes(date)
    if (!hasCheckIn) return
    
    this.setData({ 
      selectedDate: date,
      loading: true,
      selectedRecord: null
    })
    
    this.loadRecordDetail(date)
  },

  // 加载记录详情
  loadRecordDetail(date) {
    wx.request({
      url: `${app.globalData.apiBase}/checkin/detail`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: { date },
      success: (res) => {
        if (res.data.success) {
          this.setData({ 
            selectedRecord: res.data.data,
            loading: false
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({
            title: '加载失败',
            icon: 'error'
          })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        })
      }
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
      currentMonth,
      selectedDate: '',
      selectedRecord: null
    })
    this.generateCalendar()
    this.loadCheckInData()
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
      currentMonth,
      selectedDate: '',
      selectedRecord: null
    })
    this.generateCalendar()
    this.loadCheckInData()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  // 执行搜索
  onSearch() {
    const { searchKeyword } = this.data
    if (!searchKeyword.trim()) return
    
    this.setData({ showSearchResults: true })
    
    wx.request({
      url: `${app.globalData.apiBase}/checkin/search`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: { keyword: searchKeyword },
      success: (res) => {
        if (res.data.success) {
          this.setData({ searchResults: res.data.data })
        }
      },
      fail: () => {
        wx.showToast({
          title: '搜索失败',
          icon: 'error'
        })
      }
    })
  },

  // 隐藏搜索结果
  hideSearchResults() {
    this.setData({ 
      showSearchResults: false,
      searchResults: []
    })
  },

  // 选择搜索结果
  selectSearchResult(e) {
    const record = e.currentTarget.dataset.record
    this.setData({
      selectedDate: record.date,
      selectedRecord: record,
      showSearchResults: false
    })
    
    // 跳转到对应月份
    const [year, month] = record.date.split('-')
    this.setData({
      currentYear: parseInt(year),
      currentMonth: parseInt(month)
    })
    this.generateCalendar()
    this.loadCheckInData()
  },

  // 图片预览
  previewImage(e) {
    const { index } = e.currentTarget.dataset
    const { selectedRecord } = this.data
    wx.previewImage({
      current: selectedRecord.images[index],
      urls: selectedRecord.images
    })
  },

  // 导出记录
  exportRecord() {
    const { selectedRecord } = this.data
    if (!selectedRecord) return
    
    wx.showActionSheet({
      itemList: ['导出为PDF', '导出为图片', '分享到微信'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.exportToPDF()
            break
          case 1:
            this.exportToImage()
            break
          case 2:
            this.shareToWeChat()
            break
        }
      }
    })
  },

  // 导出为PDF
  exportToPDF() {
    wx.showLoading({ title: '生成中...' })
    
    wx.request({
      url: `${app.globalData.apiBase}/export/pdf`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: {
        recordId: this.data.selectedRecord.id
      },
      success: (res) => {
        if (res.data.success) {
          wx.downloadFile({
            url: res.data.fileUrl,
            success: (downloadRes) => {
              wx.openDocument({
                filePath: downloadRes.tempFilePath,
                fileType: 'pdf'
              })
            }
          })
        }
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 导出为图片
  exportToImage() {
    wx.showLoading({ title: '生成中...' })
    
    // 这里可以使用canvas生成图片
    // 简化实现，直接分享
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }, 1000)
  },

  // 分享记录
  shareRecord() {
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  // 分享到微信
  shareToWeChat() {
    const { selectedRecord } = this.data
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 页面分享
  onShareAppMessage() {
    const { selectedRecord } = this.data
    return {
      title: `我的${selectedRecord.date}学习打卡记录`,
      path: `/pages/history/history?date=${selectedRecord.date}`,
      imageUrl: selectedRecord.images[0] || '/images/share-default.png'
    }
  }
})