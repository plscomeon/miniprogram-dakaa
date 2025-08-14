// 今日打卡页面逻辑
const CloudApi = require('../../utils/cloudApi.js')

Page({
  onLoad() {
    // 页面加载时初始化日期
    this.updateDate();
  },
  data: {
    isLogin: false,
    userInfo: {},
    motivationText: '', // 激励语
    showLoginModal: false,
    showUserMenu: false,
    currentDate: '',
    questions: [''],
    mistakeImages: [], // 错题图片数组
    diary: '',
    images: [],
    submitting: false,
    showSuccessToast: false
  },

  async onShow() {
    console.log('Checkin页面：onShow');
    
    // 调试：检查本地存储状态
    this.debugCurrentState();
    
    // 每次进入页面，都从全局app.js同步最新的登录状态
    await this.syncLoginStatus();
    
    // 更新日期显示
    this.updateDate();
    
    // 如果已登录，则加载今天的打卡记录
    if (this.data.isLogin) {
      this.generateMotivationText(); // 生成激励语
      this.loadDraft();
      this.checkTodayRecord();
    }
    
    // 设置用户信息更新监听
    const app = getApp();
    app.onUserInfoUpdate = (userInfo) => {
      console.log('Checkin页面：收到用户信息更新通知:', userInfo);
      this.setData({
        userInfo: userInfo,
        isLogin: true
      });
    };
  },

  onHide() {
    // 如果已登录，则保存草稿
    if (this.data.isLogin) {
      this.saveDraft();
    }
  },

  // 同步登录状态 - 使用统一的用户信息获取方法
  async syncLoginStatus() {
    const app = getApp();
    
    console.log('Checkin页面：开始同步登录状态...');
    
    // 使用app的统一方法获取有效用户信息
    const validUserInfo = app.getValidUserInfo();
    
    if (validUserInfo) {
      console.log('Checkin页面：获取到有效用户信息:', validUserInfo);
      
      // 更新页面状态
      this.setData({
        isLogin: true,
        userInfo: validUserInfo
      });
      
      console.log('Checkin页面：登录状态已同步，用户:', validUserInfo.nickName);
      
      // 生成激励语
      this.generateMotivationText();
    } else {
      console.log('Checkin页面：没有有效用户信息，设置为未登录状态');
      this.setData({
        isLogin: false,
        userInfo: {}
      });
    }
  },

  // 页面级别的用户信息更新方法（由app.js调用）
  updateUserInfo(userInfo) {
    console.log('Checkin页面：收到用户信息更新通知:', userInfo);
    
    if (userInfo && userInfo.nickName && userInfo.nickName !== '微信用户') {
      this.setData({
        isLogin: true,
        userInfo: userInfo
      });
      console.log('Checkin页面：用户信息已更新');
    }
  },

  // 调试方法：显示当前状态
  debugCurrentState() {
    const app = getApp();
    const localUserInfo = wx.getStorageSync('userInfo');
    
    console.log('=== Checkin页面状态调试 ===');
    console.log('页面登录状态:', this.data.isLogin);
    console.log('页面用户信息:', this.data.userInfo);
    console.log('全局登录状态:', app.globalData.isLoggedIn);
    console.log('全局用户信息:', app.globalData.userInfo);
    console.log('本地存储用户信息:', localUserInfo);
    console.log('=========================');
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

  // 生成随机激励语
  generateMotivationText() {
    const motivations = [
      '今天也要加油哦！',
      '学习让你更优秀',
      '每天进步一点点',
      '坚持就是胜利',
      '知识改变命运',
      '努力成就梦想',
      '今日事今日毕',
      '学而时习之',
      '温故而知新',
      '书山有路勤为径',
      '学无止境',
      '厚德载物',
      '自强不息',
      '博学笃行',
      '勤奋是成功之母',
      '天道酬勤',
      '学习使人进步',
      '知识就是力量',
      '持之以恒',
      '精益求精'
    ];
    
    const randomIndex = Math.floor(Math.random() * motivations.length);
    const motivationText = motivations[randomIndex];
    
    this.setData({
      motivationText: motivationText
    });
    
    console.log('生成激励语:', motivationText);
  },

  // --- 微信官方登录流程 ---

  // 显示登录弹窗
  showLoginModal() {
    console.log('Checkin页面：显示登录弹窗');
    this.setData({ 
      showLoginModal: true
    });
  },

  // 隐藏登录弹窗
  hideLoginModal() {
    console.log('Checkin页面：隐藏登录弹窗');
    this.setData({ 
      showLoginModal: false
    });
  },

  // 微信一键登录 - 必须在用户点击事件中直接调用 getUserProfile
  oneClickLogin() {
    if (this.data.submitting) return;
    
    console.log('Checkin页面：开始微信登录流程');
    
    this.setData({ submitting: true });
    wx.showLoading({ title: '登录中...' });
    
    // 第一步：直接在用户点击事件中调用 getUserProfile
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (userProfileRes) => {
        try {
          console.log('Checkin页面：getUserProfile成功:', userProfileRes);
          
          if (!userProfileRes.userInfo || !userProfileRes.userInfo.nickName) {
            throw new Error('获取的用户信息不完整');
          }
          
          // 第二步：获取登录 code
          const loginResult = await this.wxLogin();
          if (!loginResult.success) {
            throw new Error('获取登录凭证失败');
          }
          
          console.log('Checkin页面：获取到登录code:', loginResult.code);
          console.log('Checkin页面：获取用户信息成功:', userProfileRes.userInfo);
          
          // 第三步：处理登录
          await this.processUserLogin(loginResult.code, userProfileRes.userInfo);
          
        } catch (error) {
          console.error('Checkin页面：登录失败:', error);
          wx.showToast({
            title: error.message || '登录失败，请重试',
            icon: 'none',
            duration: 2000
          });
        } finally {
          this.setData({ submitting: false });
          wx.hideLoading();
        }
      },
      fail: (err) => {
        console.error('Checkin页面：getUserProfile失败:', err);
        this.setData({ submitting: false });
        wx.hideLoading();
        wx.showToast({
          title: '用户取消授权或获取失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 调用 wx.login 获取 code
  wxLogin() {
    return new Promise((resolve) => {
      wx.login({
        success: (res) => {
          console.log('Checkin页面：wx.login成功:', res);
          if (res.code) {
            resolve({
              success: true,
              code: res.code
            });
          } else {
            resolve({
              success: false,
              message: '登录失败：' + res.errMsg
            });
          }
        },
        fail: (err) => {
          console.error('Checkin页面：wx.login失败:', err);
          resolve({
            success: false,
            message: '登录失败：' + err.errMsg
          });
        }
      });
    });
  },



  // 处理用户登录
  // 处理用户登录 - 按照官方文档流程
  async processUserLogin(code, userInfo) {
    console.log('Checkin页面：开始处理用户登录');
    console.log('Checkin页面：登录code:', code);
    console.log('Checkin页面：用户信息:', userInfo);
    
    try {
      // 1. 准备登录数据，包含 code 和用户信息
      const loginData = {
        code: code,
        userInfo: {
          nickName: userInfo.nickName || '微信用户',
          avatarUrl: userInfo.avatarUrl || '/images/default-avatar.png',
          gender: userInfo.gender || 0,
          country: userInfo.country || '',
          province: userInfo.province || '',
          city: userInfo.city || '',
          language: userInfo.language || 'zh_CN'
        }
      };
      console.log('Checkin页面：准备发送登录数据:', loginData);

      // 2. 调用云函数处理登录（包含获取openid和保存用户信息）
      console.log('Checkin页面：开始调用登录云函数...');
      const loginResult = await CloudApi.login(loginData);
      if (!loginResult.success) {
        throw new Error(loginResult.message || '登录失败');
      }
      console.log('Checkin页面：登录云函数调用成功:', loginResult.data);

      // 3. 使用登录成功后返回的用户信息
      const finalUserInfo = loginResult.data.userInfo;
      console.log('Checkin页面：最终用户信息:', finalUserInfo);

      // 4. 更新全局状态
      const app = getApp();
      app.setUserInfo(finalUserInfo);
      console.log('Checkin页面：全局用户信息已更新');
      
      // 5. 更新页面状态
      this.setData({
        userInfo: finalUserInfo,
        isLogin: true,
        showLoginModal: false
      });

      // 6. 登录成功后生成激励语
      this.generateMotivationText();

      console.log('Checkin页面：页面登录状态更新完成:', this.data.isLogin);
      console.log('Checkin页面：页面用户信息更新完成:', this.data.userInfo);
      
      // 7. 显示成功提示
      wx.showToast({ 
        title: '登录成功', 
        icon: 'success',
        duration: 2000
      });

    } catch (error) {
      console.error('Checkin页面：登录失败:', error);
      wx.showToast({ 
        title: error.message || '登录失败，请重试', 
        icon: 'none',
        duration: 3000
      });
      throw error; // 重新抛出错误，让调用方处理
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

  // 错题图片相关方法
  chooseMistakeImages() {
    const maxCount = 9 - this.data.mistakeImages.length
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多上传9张错题图片',
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
          this.uploadMistakeImages(tempFilePaths)
        },
        fail: (err) => {
          console.log('选择错题图片失败:', err)
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
          this.uploadMistakeImages(res.tempFilePaths)
        },
        fail: (err) => {
          console.log('选择错题图片失败:', err)
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      })
    }
  },

  async uploadMistakeImages(filePaths) {
    wx.showLoading({ title: '上传错题图片中...' })
    
    try {
      const uploadPromises = filePaths.map(async (filePath, index) => {
        const fileName = `mistake_${Date.now()}_${index}.jpg`
        const result = await CloudApi.uploadFile(filePath, fileName, 'mistakes')
        if (result.success) {
          return result.data.fileID
        } else {
          throw new Error(`错题图片${index + 1}上传失败`)
        }
      })
      
      const uploadedFileIDs = await Promise.all(uploadPromises)
      
      this.setData({
        mistakeImages: [...this.data.mistakeImages, ...uploadedFileIDs]
      })
      
      wx.hideLoading()
      wx.showToast({
        title: '错题图片上传成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('错题图片上传失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '图片上传失败，请重试',
        icon: 'none'
      })
    }
  },

  deleteMistakeImage(e) {
    const { index } = e.currentTarget.dataset
    const mistakeImages = this.data.mistakeImages.filter((_, i) => i !== index)
    this.setData({ mistakeImages })
  },

  previewMistakeImage(e) {
    const { index } = e.currentTarget.dataset
    wx.previewImage({
      current: this.data.mistakeImages[index],
      urls: this.data.mistakeImages
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
    console.log('开始提交打卡...')
    
    // 首先检查登录状态
    if (!this.data.isLogin) {
      console.log('用户未登录')
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
    console.log('有效问题数量:', validQuestions.length)
    
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

    console.log('验证通过，开始提交')
    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      const data = {
        questions: validQuestions,
        mistakeImages: this.data.mistakeImages, // 错题图片
        diary: this.data.diary,
        images: this.data.images
      }

      console.log('准备保存打卡数据:', data)
      wx.showLoading({ title: '保存数据中...' })

      // 保存到云数据库
      const result = await CloudApi.saveCheckin(data)
      console.log('保存结果:', result)
      
      if (result.success) {
        console.log('打卡成功')
        this.showSuccessToast()
        this.clearDraft()
        
        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        })
      } else {
        console.error('保存失败:', result.message)
        throw new Error(result.message || '保存失败')
      }
    } catch (error) {
      console.error('提交打卡失败:', error)
      wx.showToast({
        title: '提交失败: ' + (error.message || '未知错误'),
        icon: 'none',
        duration: 3000
      })
    } finally {
      wx.hideLoading()
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

  // 头像加载错误处理
  onAvatarError(e) {
    console.log('头像加载失败:', e);
    console.log('当前头像URL:', this.data.userInfo.avatarUrl);
    
    // 如果头像加载失败，使用默认头像
    const userInfo = { ...this.data.userInfo };
    userInfo.avatarUrl = '/images/default-avatar.png';
    this.setData({ userInfo });
    
    // 同时更新全局状态
    const app = getApp();
    app.setUserInfo(userInfo);
    
    console.log('已切换到默认头像');
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
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          
          // 清除全局状态
          const app = getApp();
          app.globalData.isLoggedIn = false;
          app.globalData.userInfo = null;
          
          // 更新页面状态
          this.setData({
            isLogin: false,
            userInfo: {}
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    })
  },

  // 草稿相关方法
  saveDraft() {
    const draft = {
      questions: this.data.questions,
      mistakeImages: this.data.mistakeImages,
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
        mistakeImages: draft.mistakeImages || [],
        diary: draft.diary || ''
      })
    }
  },

  clearDraft() {
    wx.removeStorageSync('checkin_draft')
  },

  // 下载头像到本地临时文件
  downloadAvatarToLocal(avatarUrl) {
    return new Promise((resolve, reject) => {
      // 检查是否已经是本地文件路径
      if (avatarUrl.startsWith('wxfile://') || avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('/tmp/')) {
        console.log('头像已经是本地路径，无需下载');
        resolve(avatarUrl);
        return;
      }

      console.log('下载头像:', avatarUrl);
      wx.downloadFile({
        url: avatarUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('头像下载成功:', res.tempFilePath);
            resolve(res.tempFilePath);
          } else {
            console.error('头像下载失败，状态码:', res.statusCode);
            reject(new Error(`下载头像失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('头像下载失败:', err);
          reject(err);
        }
      });
    });
  }
})