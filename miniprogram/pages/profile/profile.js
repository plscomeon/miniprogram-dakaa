// 用户中心页面逻辑
const app = getApp()

Page({
  data: {
    userInfo: {},
    userStats: {
      totalDays: 0,
      continuousDays: 0,
      monthlyDays: 0
    },
    dataStats: {
      totalQuestions: 0,
      totalVideos: 0,
      totalDiaries: 0,
      totalImages: 0
    },
    studyTime: {
      today: '0分钟',
      thisWeek: '0分钟',
      thisMonth: '0分钟'
    },
    reminderEnabled: true,
    darkModeEnabled: false,
    cacheSize: '0KB',
    version: '1.0.0',
    showExportModal: false,
    exportDateRange: 'month'
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
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({ userInfo })
  },

  // 加载用户数据
  loadUserData() {
    this.loadUserStats()
    this.loadDataStats()
    this.loadStudyTime()
  },

  // 加载用户统计
  loadUserStats() {
    wx.request({
      url: `${app.globalData.apiBase}/user/stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({ userStats: res.data.data })
        }
      },
      fail: () => {
        console.error('加载用户统计失败')
      }
    })
  },

  // 加载数据统计
  loadDataStats() {
    wx.request({
      url: `${app.globalData.apiBase}/user/data-stats`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({ dataStats: res.data.data })
        }
      },
      fail: () => {
        console.error('加载数据统计失败')
      }
    })
  },

  // 加载学习时长
  loadStudyTime() {
    wx.request({
      url: `${app.globalData.apiBase}/user/study-time`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.data.success) {
          this.setData({ studyTime: res.data.data })
        }
      },
      fail: () => {
        console.error('加载学习时长失败')
      }
    })
  },

  // 加载设置
  loadSettings() {
    const reminderEnabled = wx.getStorageSync('reminderEnabled') !== false
    const darkModeEnabled = wx.getStorageSync('darkModeEnabled') === true
    this.setData({ reminderEnabled, darkModeEnabled })
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
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadAvatar(res.tempFilePaths[0])
      }
    })
  },

  // 上传头像
  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...' })
    
    wx.uploadFile({
      url: `${app.globalData.apiBase}/user/avatar`,
      filePath,
      name: 'avatar',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.success) {
          const userInfo = { ...this.data.userInfo, avatar: data.avatarUrl }
          this.setData({ userInfo })
          wx.setStorageSync('userInfo', userInfo)
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 导出数据
  exportData() {
    this.setData({ showExportModal: true })
  },

  hideExportModal() {
    this.setData({ showExportModal: false })
  },

  // 选择日期范围
  selectDateRange(e) {
    const { range } = e.currentTarget.dataset
    this.setData({ exportDateRange: range })
  },

  // 导出Excel
  exportExcel() {
    this.performExport('excel')
  },

  // 导出PDF
  exportPDF() {
    this.performExport('pdf')
  },

  // 导出JSON
  exportJSON() {
    this.performExport('json')
  },

  // 执行导出
  performExport(format) {
    wx.showLoading({ title: '生成中...' })
    
    wx.request({
      url: `${app.globalData.apiBase}/export/${format}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: {
        dateRange: this.data.exportDateRange
      },
      success: (res) => {
        if (res.data.success) {
          this.hideExportModal()
          wx.downloadFile({
            url: res.data.fileUrl,
            success: (downloadRes) => {
              wx.showModal({
                title: '导出成功',
                content: '文件已保存到本地，是否立即查看？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openDocument({
                      filePath: downloadRes.tempFilePath,
                      fileType: format
                    })
                  }
                }
              })
            },
            fail: () => {
              wx.showToast({
                title: '下载失败',
                icon: 'error'
              })
            }
          })
        } else {
          wx.showToast({
            title: res.data.message || '导出失败',
            icon: 'error'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 设置提醒
  setReminder() {
    wx.navigateTo({
      url: '/pages/settings/reminder'
    })
  },

  // 提醒开关变化
  onReminderChange(e) {
    const enabled = e.detail.value
    this.setData({ reminderEnabled: enabled })
    wx.setStorageSync('reminderEnabled', enabled)
    
    if (enabled) {
      this.requestNotificationPermission()
    }
  },

  // 请求通知权限
  requestNotificationPermission() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userInfo']) {
          wx.authorize({
            scope: 'scope.userInfo',
            success: () => {
              this.setDailyReminder()
            }
          })
        } else {
          this.setDailyReminder()
        }
      }
    })
  },

  // 设置每日提醒
  setDailyReminder() {
    // 这里可以设置本地通知或者服务器推送
    wx.showToast({
      title: '提醒已开启',
      icon: 'success'
    })
  },

  // 深色模式开关
  onDarkModeChange(e) {
    const enabled = e.detail.value
    this.setData({ darkModeEnabled: enabled })
    wx.setStorageSync('darkModeEnabled', enabled)
    
    // 这里可以切换主题
    wx.showToast({
      title: enabled ? '已切换到深色模式' : '已切换到浅色模式',
      icon: 'none'
    })
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: `确定要清理 ${this.data.cacheSize} 的缓存数据吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              this.setData({ cacheSize: '0KB' })
              wx.showToast({
                title: '缓存已清理',
                icon: 'success'
              })
              // 重新登录
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/login/login'
                })
              }, 1500)
            },
            fail: () => {
              wx.showToast({
                title: '清理失败',
                icon: 'error'
              })
            }
          })
        }
      }
    })
  },

  // 帮助反馈
  feedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 关于我们
  about() {
    wx.navigateTo({
      url: '/pages/about/about'
    })
  },

  // 前往设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？退出后需要重新登录。',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          // 清除用户数据
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('checkin_draft')
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            })
          }, 1500)
        }
      }
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: 'Learning Tracker - 我的学习打卡记录',
      path: '/pages/checkin/checkin',
      imageUrl: '/images/share-default.png'
    }
  }
})