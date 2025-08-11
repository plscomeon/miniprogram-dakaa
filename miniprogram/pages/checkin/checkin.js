// 今日打卡页面逻辑
const CloudApi = require('../../utils/cloudApi.js')

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
    submitting: false,
    showSuccessToast: false,
    showUserMenu: false
  },

  onLoad() {
    // 检查全局登录状态
    const app = getApp()
    if (!app.isUserLoggedIn()) {
      console.log('用户未登录，显示默认信息')
    }
    
    this.initPage()
  },

  onShow() {
    // 每次显示页面时检查用户信息更新
    this.getUserInfo()
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
  async getUserInfo() {
    try {
      const result = await CloudApi.getUserInfo()
      if (result.success && result.data) {
        const userInfo = {
          nickName: result.data.nickName || '',
          avatarUrl: result.data.avatarUrl || '/images/default-avatar.png'
        }
        this.setData({ userInfo })
        
        // 更新全局用户信息
        const app = getApp()
        app.setUserInfo(userInfo)
      } else {
        // 设置默认用户信息，引导用户完善
        this.setDefaultUserInfo()
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      this.setDefaultUserInfo()
    }
  },

  // 设置默认用户信息
  setDefaultUserInfo() {
    const defaultUserInfo = {
      nickName: '',
      avatarUrl: '/images/default-avatar.png'
    }
    this.setData({ userInfo: defaultUserInfo })
  },

  // 选择头像 - 使用微信小程序最新API
  async onChooseAvatar(e) {
    console.log('选择头像事件:', e.detail)
    const { avatarUrl } = e.detail
    
    if (!avatarUrl) {
      console.error('头像URL为空')
      return
    }
    
    try {
      // 上传头像到云存储
      const uploadResult = await CloudApi.uploadFile(avatarUrl, 'avatar.jpg', 'avatar')
      if (!uploadResult.success) {
        throw new Error('头像上传失败')
      }
      
      const currentUserInfo = this.data.userInfo || {}
      const newUserInfo = {
        ...currentUserInfo,
        avatarUrl: uploadResult.data.fileID
      }
      
      // 保存用户信息到云数据库
      const saveResult = await CloudApi.saveUserInfo(newUserInfo)
      if (!saveResult.success) {
        throw new Error('用户信息保存失败')
      }
      
      // 更新全局用户信息
      const app = getApp()
      app.setUserInfo(newUserInfo)
      
      this.setData({ userInfo: newUserInfo })
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('头像更新失败:', error)
      wx.showToast({
        title: '头像更新失败，请重试',
        icon: 'none'
      })
    }
  },

  // 昵称输入完成 - 使用最新的输入处理方式
  async onNicknameChange(e) {
    const nickName = e.detail.value.trim()
    console.log('昵称输入:', nickName)
    
    if (nickName && nickName.length > 0) {
      try {
        const currentUserInfo = this.data.userInfo || {}
        const newUserInfo = {
          ...currentUserInfo,
          nickName: nickName
        }
        
        // 保存用户信息到云数据库
        const saveResult = await CloudApi.saveUserInfo(newUserInfo)
        if (!saveResult.success) {
          throw new Error('昵称保存失败')
        }
        
        // 更新全局用户信息
        const app = getApp()
        app.setUserInfo(newUserInfo)
        
        this.setData({ userInfo: newUserInfo })
        
        wx.showToast({
          title: '昵称保存成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('昵称保存失败:', error)
        wx.showToast({
          title: '昵称保存失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 昵称输入实时处理
  onNicknameInput(e) {
    const nickName = e.detail.value
    const currentUserInfo = this.data.userInfo || {}
    const newUserInfo = {
      ...currentUserInfo,
      nickName: nickName
    }
    this.setData({ userInfo: newUserInfo })
  },

  // 检查今日是否已有记录
  async checkTodayRecord() {
    try {
      const result = await CloudApi.getCheckinByDate(this.data.currentDate)
      if (result.success && result.data) {
        const todayRecord = result.data
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
    } catch (error) {
      console.error('检查今日记录失败:', error)
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

  // 视频上传相关方法 - 使用最新的chooseMedia API
  chooseVideo() {
    console.log('开始选择视频...')
    
    // 优先使用最新的chooseMedia API
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
        maxDuration: 300, // 5分钟
        camera: 'back',
        success: (res) => {
          console.log('chooseMedia选择视频成功:', res)
          const tempFile = res.tempFiles[0]
          
          // 检查视频大小（限制50MB）
          if (tempFile.size > 50 * 1024 * 1024) {
            wx.showToast({
              title: '视频文件过大，请选择小于50MB的视频',
              icon: 'none',
              duration: 2000
            })
            return
          }
          
          // 检查视频时长（限制5分钟）
          if (tempFile.duration > 300) {
            wx.showToast({
              title: '视频时长过长，请选择5分钟内的视频',
              icon: 'none',
              duration: 2000
            })
            return
          }
          
          // 直接保存视频信息
          this.setData({
            videoInfo: {
              url: tempFile.tempFilePath,
              cover: tempFile.thumbTempFilePath || tempFile.tempFilePath
            }
          })
          
          wx.showToast({
            title: '视频添加成功',
            icon: 'success'
          })
        },
        fail: (err) => {
          console.error('chooseMedia选择视频失败:', err)
          // 降级使用chooseVideo
          this.chooseVideoFallback()
        }
      })
    } else {
      // 降级使用chooseVideo
      this.chooseVideoFallback()
    }
  },

  // 降级方案：使用chooseVideo API
  chooseVideoFallback() {
    console.log('使用chooseVideo降级方案...')
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 300, // 5分钟
      camera: 'back',
      success: (res) => {
        console.log('chooseVideo选择视频成功:', res)
        
        // 检查视频大小（限制50MB）
        if (res.size && res.size > 50 * 1024 * 1024) {
          wx.showToast({
            title: '视频文件过大，请选择小于50MB的视频',
            icon: 'none',
            duration: 2000
          })
          return
        }
        
        // 检查视频时长（限制5分钟）
        if (res.duration && res.duration > 300) {
          wx.showToast({
            title: '视频时长过长，请选择5分钟内的视频',
            icon: 'none',
            duration: 2000
          })
          return
        }
        
        // 直接保存视频信息
        this.setData({
          videoInfo: {
            url: res.tempFilePath,
            cover: res.thumbTempFilePath || res.tempFilePath
          }
        })
        
        wx.showToast({
          title: '视频添加成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('chooseVideo选择视频失败:', err)
        wx.showToast({
          title: '选择视频失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
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

  async uploadImages(filePaths) {
    wx.showLoading({ title: '上传图片中...' })
    
    try {
      const uploadPromises = filePaths.map(async (filePath, index) => {
        const fileName = `image_${Date.now()}_${index}.jpg`
        const result = await CloudApi.uploadFile(filePath, fileName, 'images')
        if (result.success) {
          return result.data.fileID
        } else {
          throw new Error(`图片${index + 1}上传失败`)
        }
      })
      
      const uploadedFileIDs = await Promise.all(uploadPromises)
      
      this.setData({
        images: [...this.data.images, ...uploadedFileIDs]
      })
      
      wx.hideLoading()
      wx.showToast({
        title: '图片上传成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('图片上传失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '图片上传失败，请重试',
        icon: 'none'
      })
    }
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
  async submitCheckin() {
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

    try {
      // 如果有视频，先上传视频
      let videoFileID = ''
      if (this.data.videoInfo.url) {
        wx.showLoading({ title: '上传视频中...' })
        const videoResult = await CloudApi.uploadFile(
          this.data.videoInfo.url, 
          `video_${Date.now()}.mp4`, 
          'videos'
        )
        if (videoResult.success) {
          videoFileID = videoResult.data.fileID
        }
        wx.hideLoading()
      }

      const data = {
        questions: validQuestions,
        videoUrl: videoFileID,
        videoCover: this.data.videoInfo.cover,
        diary: this.data.diary,
        images: this.data.images
      }

      // 保存到云数据库
      const result = await CloudApi.saveCheckin(data)
      
      if (result.success) {
        this.showSuccessToast()
        this.clearDraft()
        
        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.message || '保存失败')
      }
    } catch (error) {
      console.error('提交打卡失败:', error)
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'error'
      })
    } finally {
      this.setData({ submitting: false })
    }
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