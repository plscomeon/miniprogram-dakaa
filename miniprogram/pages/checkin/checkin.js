// 今日打卡页面逻辑
const Storage = require('../../utils/storage.js')

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
    this.checkTodayRecord()
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
    const userInfo = Storage.getUserInfo()
    this.setData({ userInfo })
    
    // 如果没有用户信息，尝试获取微信用户信息
    if (!userInfo.nickName || userInfo.nickName === '学习者') {
      this.getWechatUserInfo()
    }
  },

  // 获取微信用户信息 - 使用最新API
  getUserProfile() {
    // 检查是否支持getUserProfile
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于显示用户信息',
        success: (res) => {
          const userInfo = res.userInfo
          Storage.saveUserInfo(userInfo)
          this.setData({ userInfo })
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
        },
        fail: (err) => {
          console.log('用户拒绝授权', err)
          wx.showToast({
            title: '需要授权才能使用完整功能',
            icon: 'none'
          })
          // 设置默认用户信息
          this.setDefaultUserInfo()
        }
      })
    } else {
      // 降级处理，设置默认用户信息
      this.setDefaultUserInfo()
    }
  },

  // 设置默认用户信息
  setDefaultUserInfo() {
    const defaultUserInfo = {
      nickName: '学习者',
      avatarUrl: '/images/default-avatar.png'
    }
    Storage.saveUserInfo(defaultUserInfo)
    this.setData({ userInfo: defaultUserInfo })
    wx.showToast({
      title: '已设置默认信息',
      icon: 'success'
    })
  },

  // 选择头像 - 使用新版API
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const currentUserInfo = this.data.userInfo || {}
    const newUserInfo = {
      ...currentUserInfo,
      avatarUrl: avatarUrl
    }
    Storage.saveUserInfo(newUserInfo)
    this.setData({ userInfo: newUserInfo })
    
    wx.showToast({
      title: '头像更新成功',
      icon: 'success'
    })
  },

  // 获取微信用户信息 - 兼容旧版本
  getWechatUserInfo() {
    // 先尝试获取已授权的用户信息
    wx.getUserInfo({
      success: (res) => {
        const userInfo = res.userInfo
        Storage.saveUserInfo(userInfo)
        this.setData({ userInfo })
      },
      fail: () => {
        // 如果没有授权，引导用户点击登录按钮
        console.log('用户未授权，需要点击登录按钮')
      }
    })
  },

  // 检查今日是否已有记录
  checkTodayRecord() {
    const todayRecord = Storage.getCheckinByDate(this.data.currentDate)
    if (todayRecord) {
      // 如果今日已有记录，加载数据
      this.setData({
        questions: todayRecord.questions || [''],
        videoInfo: {
          url: todayRecord.videoUrl || '',
          cover: todayRecord.videoCover || ''
        },
        diary: todayRecord.diary || '',
        images: todayRecord.images || []
      })
    }
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
    // 检查是否支持chooseMedia（新版API）
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
        maxDuration: 300, // 5分钟
        success: (res) => {
          const media = res.tempFiles[0]
          // 检查视频大小（限制50MB）
          if (media.size > 50 * 1024 * 1024) {
            wx.showToast({
              title: '视频文件过大，请选择小于50MB的视频',
              icon: 'none',
              duration: 2000
            })
            return
          }
          
          this.uploadVideo(media.tempFilePath, media.thumbTempFilePath)
        },
        fail: (err) => {
          console.log('选择视频失败:', err)
          wx.showToast({
            title: '选择视频失败',
            icon: 'none'
          })
        }
      })
    } else {
      // 降级使用chooseVideo
      wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 300, // 5分钟
        success: (res) => {
          // 检查视频大小（限制50MB）
          if (res.size > 50 * 1024 * 1024) {
            wx.showToast({
              title: '视频文件过大，请选择小于50MB的视频',
              icon: 'none',
              duration: 2000
            })
            return
          }
          
          this.uploadVideo(res.tempFilePath, res.thumbTempFilePath)
        },
        fail: (err) => {
          console.log('选择视频失败:', err)
          wx.showToast({
            title: '选择视频失败',
            icon: 'none'
          })
        }
      })
    }
  },

  uploadVideo(filePath, thumbPath) {
    this.setData({ uploadProgress: 10 })
    
    // 模拟上传进度
    const progressInterval = setInterval(() => {
      const currentProgress = this.data.uploadProgress
      if (currentProgress < 90) {
        this.setData({
          uploadProgress: currentProgress + 10
        })
      }
    }, 200)

    // 模拟上传完成
    setTimeout(() => {
      clearInterval(progressInterval)
      
      // 保存视频到本地存储（实际项目中应该上传到服务器）
      this.setData({
        videoInfo: {
          url: filePath,
          cover: thumbPath || filePath // 使用缩略图或视频文件作为封面
        },
        uploadProgress: 100
      })
      
      wx.showToast({
        title: '视频上传成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        this.setData({ uploadProgress: 0 })
      }, 1000)
    }, 2000)
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

    // 检查是否支持chooseMedia（新版API）
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: maxCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePaths = res.tempFiles.map(file => file.tempFilePath)
          this.uploadImages(tempFilePaths)
        },
        fail: (err) => {
          console.log('选择图片失败:', err)
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      })
    } else {
      // 降级使用chooseImage
      wx.chooseImage({
        count: maxCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadImages(res.tempFilePaths)
        },
        fail: (err) => {
          console.log('选择图片失败:', err)
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      })
    }
  },

  uploadImages(filePaths) {
    wx.showLoading({ title: '处理图片中...' })
    
    // 模拟图片处理和上传
    setTimeout(() => {
      // 直接使用本地临时路径（实际项目中应该上传到服务器）
      this.setData({
        images: [...this.data.images, ...filePaths]
      })
      
      wx.hideLoading()
      wx.showToast({
        title: '图片添加成功',
        icon: 'success'
      })
    }, 1000)
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

    if (!this.data.diary.trim()) {
      wx.showToast({
        title: '请填写学习日记',
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

    // 保存到本地存储
    const result = Storage.saveCheckinRecord(data)
    
    setTimeout(() => {
      if (result.success) {
        this.showSuccessToast()
        this.clearDraft()
        
        // 更新统计数据
        const stats = Storage.getStatistics()
        console.log('更新后的统计数据:', stats)
      } else {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'error'
        })
      }
      this.setData({ submitting: false })
    }, 1000)
  },

  // 显示成功提示
  showSuccessToast() {
    this.setData({ showSuccessToast: true })
    setTimeout(() => {
      this.setData({ showSuccessToast: false })
    }, 3000)
  },

  // 清空表单（保留当前数据，用户可能想要修改）
  clearForm() {
    // 不清空表单，保持当前数据
    // 用户可以继续修改今日的打卡内容
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