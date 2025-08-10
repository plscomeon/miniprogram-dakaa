// 今日打卡页面逻辑
const app = getApp()

Page({
  data: {
    currentDate: '',
    userInfo: {},
    questions: [''],
    videoInfo: {
      url: '',
      cover: ''
    },
    diary: '',
    images: [],
    uploadProgress: 0,
    submitting: false,
    showSuccessToast: false,
    showUserMenu: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.loadDraft()
  },

  onHide() {
    this.saveDraft()
  },

  // 初始化页面
  initPage() {
    // 设置当前日期
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    this.setData({
      currentDate: `${year}-${month}-${day}`
    })

    // 获取用户信息
    this.getUserInfo()
  },

  // 获取用户信息
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({ userInfo })
  },

  // 预习提问相关方法
  onQuestionInput(e) {
    const { index } = e.currentTarget.dataset
    const { value } = e.detail
    const questions = [...this.data.questions]
    questions[index] = value
    this.setData({ questions })
  },

  addQuestion() {
    if (this.data.questions.length >= 5) return
    const questions = [...this.data.questions, '']
    this.setData({ questions })
  },

  deleteQuestion(e) {
    const { index } = e.currentTarget.dataset
    const questions = this.data.questions.filter((_, i) => i !== index)
    this.setData({ questions })
  },

  // 视频上传相关方法
  chooseVideo() {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 300, // 5分钟
      success: (res) => {
        this.uploadVideo(res.tempFilePath)
      }
    })
  },

  uploadVideo(filePath) {
    this.setData({ uploadProgress: 0 })
    
    const uploadTask = wx.uploadFile({
      url: `${app.globalData.apiBase}/upload/video`,
      filePath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        this.setData({
          videoInfo: {
            url: data.url,
            cover: data.cover
          },
          uploadProgress: 100
        })
        
        setTimeout(() => {
          this.setData({ uploadProgress: 0 })
        }, 1000)
      },
      fail: (error) => {
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        })
        this.setData({ uploadProgress: 0 })
      }
    })

    uploadTask.onProgressUpdate((res) => {
      this.setData({
        uploadProgress: res.progress
      })
    })
  },

  deleteVideo() {
    this.setData({
      videoInfo: {
        url: '',
        cover: ''
      }
    })
  },

  // 学习日记相关方法
  onDiaryInput(e) {
    this.setData({
      diary: e.detail.value
    })
  },

  chooseImages() {
    const maxCount = 9 - this.data.images.length
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths)
      }
    })
  },

  uploadImages(filePaths) {
    wx.showLoading({ title: '上传中...' })
    
    const uploadPromises = filePaths.map(filePath => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.apiBase}/upload/image`,
          filePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          success: (res) => {
            const data = JSON.parse(res.data)
            resolve(data.url)
          },
          fail: reject
        })
      })
    })

    Promise.all(uploadPromises)
      .then(urls => {
        this.setData({
          images: [...this.data.images, ...urls]
        })
      })
      .catch(() => {
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  deleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = this.data.images.filter((_, i) => i !== index)
    this.setData({ images })
  },

  previewImage(e) {
    const { index } = e.currentTarget.dataset
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    })
  },

  // 提交打卡
  submitCheckin() {
    // 验证必填项
    const validQuestions = this.data.questions.filter(q => q.trim())
    if (validQuestions.length === 0) {
      wx.showToast({
        title: '请至少填写一个预习问题',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    const data = {
      date: this.data.currentDate,
      questions: validQuestions,
      videoUrl: this.data.videoInfo.url,
      videoCover: this.data.videoInfo.cover,
      diary: this.data.diary,
      images: this.data.images
    }

    wx.request({
      url: `${app.globalData.apiBase}/checkin`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data,
      success: (res) => {
        if (res.data.success) {
          this.showSuccessToast()
          this.clearForm()
          this.clearDraft()
        } else {
          wx.showToast({
            title: res.data.message || '提交失败',
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
        this.setData({ submitting: false })
      }
    })
  },

  // 显示成功提示
  showSuccessToast() {
    this.setData({ showSuccessToast: true })
    setTimeout(() => {
      this.setData({ showSuccessToast: false })
    }, 3000)
  },

  // 清空表单
  clearForm() {
    this.setData({
      questions: [''],
      videoInfo: { url: '', cover: '' },
      diary: '',
      images: []
    })
  },

  // 头像点击事件
  onAvatarTap() {
    this.setData({ showUserMenu: !this.data.showUserMenu })
  },

  hideUserMenu() {
    this.setData({ showUserMenu: false })
  },

  goToProfile() {
    this.hideUserMenu()
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  },

  // 草稿相关方法
  saveDraft() {
    const draft = {
      questions: this.data.questions,
      diary: this.data.diary,
      timestamp: Date.now()
    }
    wx.setStorageSync('checkin_draft', draft)
  },

  loadDraft() {
    const draft = wx.getStorageSync('checkin_draft')
    if (draft && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
      // 24小时内的草稿有效
      this.setData({
        questions: draft.questions || [''],
        diary: draft.diary || ''
      })
    }
  },

  clearDraft() {
    wx.removeStorageSync('checkin_draft')
  }
})