// 今日打卡页面逻辑
const CloudApi = require('../../utils/cloudApi.js')

Page({
  data: {
    currentDate: '',
    userInfo: {}, // 保存正式的用户信息（包含云存储FileID）
    isLogin: false, // 登录状态
    tempAvatarUrl: '', // 临时本地头像路径
    tempNickName: '', // 临时昵称
    showLoginModal: false, // 登录弹窗显示状态
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
    this.updateDate(); // 更新日期显示
  },

  onShow() {
    // 每次进入页面，都从全局app.js同步最新的登录状态
    this.syncLoginStatus();
    // 如果已登录，则加载今天的打卡记录
    if (this.data.isLogin) {
      this.loadDraft();
      this.checkTodayRecord();
    }
  },

  onHide() {
    // 如果已登录，则保存草稿
    if (this.data.isLogin) {
      this.saveDraft();
    }
  },

  // 同步全局登录状态到当前页面
  syncLoginStatus() {
    const app = getApp();
    this.setData({
      isLogin: app.globalData.isUserLoggedIn,
      userInfo: app.globalData.userInfo
    });
    console.log('Checkin Page: Synced login status - ', this.data.isLogin);
  },

  // 显示登录弹窗
  showLoginModal() {
    this.setData({ showLoginModal: true });
  },

  // 隐藏登录弹窗
  hideLoginModal() {
    this.setData({ showLoginModal: false });
  },

  // 更新日期显示
  updateDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      currentDate: `${year}-${month}-${day}`
    });
  },

  // --- 新版登录逻辑 ---

  // 1. 用户选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      tempAvatarUrl: avatarUrl,
    });
    console.log('Temp avatar selected:', avatarUrl);
  },

  // 2. 用户输入昵称
  onNicknameChange(e) {
    this.setData({
      tempNickName: e.detail.value.trim(),
    });
  },

  // 3. 用户点击授权登录按钮
  async submitUserInfo() {
    if (this.data.submitting) return;

    if (!this.data.tempAvatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }
    if (!this.data.tempNickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '登录中...' });

    try {
      // a. 上传头像到云存储，获取永久FileID
      const uploadResult = await CloudApi.uploadFile(this.data.tempAvatarUrl, `avatar_${Date.now()}.jpg`, 'avatars');
      if (!uploadResult.success) {
        throw new Error('头像上传失败');
      }
      const avatarFileID = uploadResult.data.fileID;

      // b. 准备用户信息（包含FileID）
      const userInfoToSave = {
        nickName: this.data.tempNickName,
        avatarUrl: avatarFileID,
      };

      // c. 保存用户信息到云数据库
      const saveResult = await CloudApi.saveUserInfo(userInfoToSave);
      if (!saveResult.success) {
        throw new Error('用户信息保存失败');
      }

      // d. 更新全局和页面数据
      const app = getApp();
      app.setUserInfo(saveResult.data); // 调用全局方法更新

      this.setData({
        userInfo: saveResult.data,
        isLogin: true,
        showLoginModal: false, // 关闭登录弹窗
        tempAvatarUrl: '', // 清空临时数据
        tempNickName: ''
      });

      wx.showToast({ title: '登录成功', icon: 'success' });

    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({ title: error.message || '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
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
    // 首先检查登录状态
    if (!this.data.isLogin) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再提交打卡',
        showCancel: true,
        cancelText: '取消',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.showLoginModal();
          }
        }
      });
      return;
    }

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