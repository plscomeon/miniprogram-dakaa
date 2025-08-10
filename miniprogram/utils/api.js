// API 请求工具
const app = getApp()

// 基础请求方法
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBase}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // token过期，跳转登录
          wx.removeStorageSync('token')
          wx.reLaunch({
            url: '/pages/login/login'
          })
          reject(new Error('登录已过期'))
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

// 用户相关API
const userAPI = {
  // 微信登录
  login(code) {
    return request({
      url: '/auth/login',
      method: 'POST',
      data: { code }
    })
  },

  // 获取用户信息
  getUserInfo() {
    return request({
      url: '/user/profile'
    })
  },

  // 更新用户信息
  updateUserInfo(data) {
    return request({
      url: '/user/profile',
      method: 'PUT',
      data
    })
  },

  // 获取用户统计
  getUserStats() {
    return request({
      url: '/user/stats'
    })
  },

  // 获取数据统计
  getDataStats() {
    return request({
      url: '/user/data-stats'
    })
  },

  // 获取学习时长
  getStudyTime() {
    return request({
      url: '/user/study-time'
    })
  }
}

// 打卡相关API
const checkinAPI = {
  // 提交打卡记录
  submitCheckin(data) {
    return request({
      url: '/checkin',
      method: 'POST',
      data
    })
  },

  // 获取打卡记录列表
  getCheckinList(year, month) {
    return request({
      url: '/checkin/list',
      data: { year, month }
    })
  },

  // 获取单日打卡记录
  getCheckinDetail(date) {
    return request({
      url: '/checkin/detail',
      data: { date }
    })
  },

  // 搜索打卡记录
  searchCheckin(keyword) {
    return request({
      url: '/checkin/search',
      data: { keyword }
    })
  },

  // 删除打卡记录
  deleteCheckin(id) {
    return request({
      url: `/checkin/${id}`,
      method: 'DELETE'
    })
  }
}

// 文件上传API
const uploadAPI = {
  // 上传图片
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBase}/upload/image`,
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            resolve(data)
          } catch (error) {
            reject(error)
          }
        },
        fail: reject
      })
    })
  },

  // 上传视频
  uploadVideo(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBase}/upload/video`,
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            resolve(data)
          } catch (error) {
            reject(error)
          }
        },
        fail: reject
      })
    })
  }
}

// 导出相关API
const exportAPI = {
  // 导出Excel
  exportExcel(dateRange) {
    return request({
      url: '/export/excel',
      method: 'POST',
      data: { dateRange }
    })
  },

  // 导出PDF
  exportPDF(dateRange) {
    return request({
      url: '/export/pdf',
      method: 'POST',
      data: { dateRange }
    })
  },

  // 导出JSON
  exportJSON(dateRange) {
    return request({
      url: '/export/json',
      method: 'POST',
      data: { dateRange }
    })
  }
}

// 统计相关API
const statsAPI = {
  // 获取学习统计
  getStudyStats(period) {
    return request({
      url: '/stats/study',
      data: { period }
    })
  },

  // 获取打卡趋势
  getCheckinTrend(days) {
    return request({
      url: '/stats/trend',
      data: { days }
    })
  }
}

module.exports = {
  request,
  userAPI,
  checkinAPI,
  uploadAPI,
  exportAPI,
  statsAPI
}