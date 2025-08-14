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
    
    // 更新日期显示
    this.updateDate();
    
    // 每次进入页面，都从全局app.js同步最新的登录状态
    await this.syncLoginStatus();
    
    // 如果已登录，则加载今天的打卡记录
    if (this.data.isLogin) {
      this.generateMotivationText(); // 生成激励语
      this.loadDraft();
      this.checkTodayRecord();
    } else {
      // 如果未登录，检查是否是第一次进入，如果是则主动获取授权
      this.checkFirstTimeAndRequestAuth();
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

  // 检查是否第一次进入并请求授权
  async checkFirstTimeAndRequestAuth() {
    try {
      // 检查是否已经请求过授权
      const hasRequestedAuth = wx.getStorageSync('hasRequestedAuth');
      const localUserInfo = wx.getStorageSync('userInfo');
      
      // 如果没有请求过授权且没有本地用户信息，则主动请求
      if (!hasRequestedAuth && (!localUserInfo || !localUserInfo.nickName || localUserInfo.nickName === '微信用户')) {
        console.log('Checkin页面：第一次进入且无用户信息，主动请求用户授权');
        
        // 延迟一下，让页面完全加载
        setTimeout(() => {
          wx.showModal({
            title: '欢迎使用学习打卡',
            content: '为了更好地为您提供服务，需要获取您的微信头像和昵称',
            confirmText: '授权登录',
            cancelText: '暂不登录',
            success: (res) => {
              if (res.confirm) {
                this.oneClickLogin();
              }
              // 标记已经请求过授权
              wx.setStorageSync('hasRequestedAuth', true);
            }
          });
        }, 800);
      } else if (localUserInfo && localUserInfo.nickName && localUserInfo.nickName !== '微信用户') {
        // 如果有本地用户信息，但页面状态未同步，则同步状态
        console.log('Checkin页面：发现本地用户信息，同步到页面状态');
        this.setData({
          userInfo: localUserInfo,
          isLogin: true
        });
        this.generateMotivationText();
        this.loadDraft();
        this.checkTodayRecord();
      }
    } catch (error) {
      console.error('Checkin页面：检查首次授权失败:', error);
    }
  },

  // 同步登录状态 - 如果没有用户信息则主动获取
  async syncLoginStatus() {
    const app = getApp();
    let globalUserInfo = app.globalData.userInfo || {};
    let isLoggedIn = app.globalData.isLoggedIn;
    
    console.log('Checkin页面：开始同步登录状态...');
    console.log('Checkin页面：全局登录状态:', isLoggedIn);
    console.log('Checkin页面：全局用户信息:', globalUserInfo);
    
    // 检查用户信息是否完整
    const hasValidUserInfo = globalUserInfo && 
                            globalUserInfo.nickName && 
                            globalUserInfo.nickName !== '' &&
                            globalUserInfo.nickName !== '微信用户';
    
    // 如果没有有效的用户信息，尝试从云端获取
    if (!hasValidUserInfo) {
      console.log('Checkin页面：没有有效用户信息，尝试从云端获取');
      try {
        const result = await CloudApi.getUserInfo();
        console.log('Checkin页面：从云端获取用户信息结果:', result);
        
        if (result.success && result.data && result.data.nickName) {
          globalUserInfo = result.data;
          isLoggedIn = true;
          
          // 更新全局状态
          app.setUserInfo(globalUserInfo);
          console.log('Checkin页面：已更新全局用户信息');
        }
      } catch (error) {
        console.error('Checkin页面：从云端获取用户信息失败:', error);
      }
    }
    
    // 确保头像URL正确
    if (globalUserInfo && globalUserInfo.avatarUrl) {
      // 如果头像URL不是完整的HTTPS URL，进行处理
      if (!globalUserInfo.avatarUrl.startsWith('https://')) {
        if (globalUserInfo.avatarUrl.startsWith('http://')) {
          globalUserInfo.avatarUrl = globalUserInfo.avatarUrl.replace('http://', 'https://');
        } else if (!globalUserInfo.avatarUrl.startsWith('/images/')) {
          // 如果不是本地默认头像，且不是完整URL，使用默认头像
          globalUserInfo.avatarUrl = '/images/default-avatar.png';
        }
      }
    }
    
    // 最终检查用户信息是否有效
    const finalHasValidUserInfo = globalUserInfo && 
                                 globalUserInfo.nickName && 
                                 globalUserInfo.nickName !== '' &&
                                 globalUserInfo.nickName !== '微信用户';
    
    console.log('Checkin页面：最终用户信息有效性:', finalHasValidUserInfo);
    console.log('Checkin页面：最终用户信息:', globalUserInfo);
    
    this.setData({
      isLogin: isLoggedIn && finalHasValidUserInfo,
      userInfo: finalHasValidUserInfo ? globalUserInfo : {}
    });
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

  // --- 微信一键登录逻辑 ---

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

  // 微信一键登录
  async oneClickLogin() {
    if (this.data.submitting) return;
    
    console.log('Checkin页面：开始微信一键登录');
    
    this.setData({ submitting: true });
    
    try {
      // 使用 wx.getUserProfile 获取用户信息
      const userProfileResult = await this.getUserProfile();
      
      if (userProfileResult.success) {
        console.log('Checkin页面：获取用户信息成功:', userProfileResult.userInfo);
        await this.processUserLogin(userProfileResult.userInfo);
      } else {
        throw new Error(userProfileResult.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('Checkin页面：一键登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      });
      this.setData({ submitting: false });
    }
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          console.log('Checkin页面：getUserProfile成功:', res);
          if (res.userInfo && res.userInfo.nickName) {
            resolve({
              success: true,
              userInfo: res.userInfo
            });
          } else {
            resolve({
              success: false,
              message: '获取的用户信息不完整'
            });
          }
        },
        fail: (err) => {
          console.error('Checkin页面：getUserProfile失败:', err);
          resolve({
            success: false,
            message: '用户取消授权或获取失败'
          });
        }
      });
    });
  },

  // 处理用户登录
  async processUserLogin(userInfo) {
    console.log('Checkin页面：开始处理用户登录:', userInfo);
    
    wx.showLoading({ title: '登录中...' });
    
    try {
      // 1. 准备用户信息，确保头像URL正确处理
      let avatarUrl = userInfo.avatarUrl || '/images/default-avatar.png';
      
      // 处理微信头像URL，确保是HTTPS
      if (avatarUrl && avatarUrl.startsWith('http://')) {
        avatarUrl = avatarUrl.replace('http://', 'https://');
      }
      
      const userInfoToSave = {
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: avatarUrl,
        gender: userInfo.gender || 0,
        country: userInfo.country || '',
        province: userInfo.province || '',
        city: userInfo.city || '',
        language: userInfo.language || 'zh_CN'
      };
      console.log('Checkin页面：准备保存用户信息:', userInfoToSave);

      // 2. 保存用户信息到云数据库
      console.log('Checkin页面：开始保存用户信息到云数据库...');
      const saveResult = await CloudApi.saveUserInfo(userInfoToSave);
      if (!saveResult.success) {
        throw new Error(saveResult.message || '用户信息保存失败');
      }
      console.log('Checkin页面：用户信息保存成功:', saveResult.data);

      // 3. 使用保存成功后返回的用户信息，确保数据完整性
      const finalUserInfo = {
        ...saveResult.data,
        nickName: saveResult.data.nickName || userInfoToSave.nickName,
        avatarUrl: saveResult.data.avatarUrl || userInfoToSave.avatarUrl
      };
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

      // 7. 加载今天的打卡记录和草稿
      this.loadDraft();
      this.checkTodayRecord();

      console.log('Checkin页面：页面登录状态更新完成:', this.data.isLogin);
      console.log('Checkin页面：页面用户信息更新完成:', this.data.userInfo);
      
      // 8. 显示成功提示
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
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  },

  // 用户信息更新监听
  updateUserInfo: function(userInfo) {
    console.log('Checkin页面：收到用户信息更新通知:', userInfo);
    if (userInfo && userInfo.nickName) {
      this.setData({
        userInfo: userInfo,
        isLogin: true
      });
      console.log('Checkin页面：用户信息已更新');
    }
  },

  // 显示用户菜单
  showUserMenu: function() {
    this.setData({ showUserMenu: true });
  },

  // 隐藏用户菜单
  hideUserMenu: function() {
    this.setData({ showUserMenu: false });
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.clearUserInfo();
          
          this.setData({
            isLogin: false,
            userInfo: {},
            showUserMenu: false
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 加载草稿
  loadDraft: function() {
    try {
      const draft = wx.getStorageSync('checkin_draft');
      if (draft) {
        this.setData({
          questions: draft.questions || [''],
          diary: draft.diary || '',
          mistakeImages: draft.mistakeImages || []
        });
        console.log('草稿加载成功');
      }
    } catch (error) {
      console.error('加载草稿失败:', error);
    }
  },

  // 保存草稿
  saveDraft: function() {
    try {
      const draft = {
        questions: this.data.questions,
        diary: this.data.diary,
        mistakeImages: this.data.mistakeImages,
        saveTime: new Date().getTime()
      };
      wx.setStorageSync('checkin_draft', draft);
      console.log('草稿保存成功');
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  },

  // 检查今天的打卡记录
  checkTodayRecord: async function() {
    try {
      const result = await CloudApi.getTodayRecord();
      if (result.success && result.data) {
        // 如果今天已经打卡，显示记录
        console.log('今天已打卡:', result.data);
        // 可以在这里添加显示已打卡状态的逻辑
      }
    } catch (error) {
      console.error('检查今天打卡记录失败:', error);
    }
  },

  // 头像点击事件
  onAvatarTap: function() {
    this.showUserMenu();
  },

  // 头像加载错误处理
  onAvatarError: function(e) {
    console.log('头像加载失败:', e);
    this.setData({
      'userInfo.avatarUrl': '/images/default-avatar.png'
    });
  },

  // 跳转到个人中心
  goToProfile: function() {
    this.hideUserMenu();
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  // 问题输入事件
  onQuestionInput: function(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const questions = this.data.questions;
    questions[index] = value;
    this.setData({ questions });
  },

  // 添加问题
  addQuestion: function() {
    const questions = this.data.questions;
    if (questions.length < 5) {
      questions.push('');
      this.setData({ questions });
    }
  },

  // 删除问题
  deleteQuestion: function(e) {
    const index = e.currentTarget.dataset.index;
    const questions = this.data.questions;
    if (questions.length > 1) {
      questions.splice(index, 1);
      this.setData({ questions });
    }
  },

  // 选择错题图片
  chooseMistakeImages: function() {
    const that = this;
    wx.chooseImage({
      count: 9 - this.data.mistakeImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePaths = res.tempFilePaths;
        const mistakeImages = that.data.mistakeImages.concat(tempFilePaths);
        that.setData({ mistakeImages });
      }
    });
  },

  // 预览错题图片
  previewMistakeImage: function(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.mistakeImages[index],
      urls: this.data.mistakeImages
    });
  },

  // 删除错题图片
  deleteMistakeImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const mistakeImages = this.data.mistakeImages;
    mistakeImages.splice(index, 1);
    this.setData({ mistakeImages });
  },

  // 日记输入事件
  onDiaryInput: function(e) {
    this.setData({ diary: e.detail.value });
  },

  // 选择图片
  chooseImages: function() {
    const that = this;
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePaths = res.tempFilePaths;
        const images = that.data.images.concat(tempFilePaths);
        that.setData({ images });
      }
    });
  },

  // 预览图片
  previewImage: function(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  // 提交打卡
  submitCheckin: async function() {
    if (this.data.submitting) return;
    
    // 验证必填内容
    const hasQuestions = this.data.questions.some(q => q.trim() !== '');
    const hasDiary = this.data.diary.trim() !== '';
    
    if (!hasQuestions && !hasDiary && this.data.mistakeImages.length === 0) {
      wx.showToast({
        title: '请至少填写一项内容',
        icon: 'none'
      });
      return;
    }

    // 检查登录状态，如果未登录则先登录
    if (!this.data.isLogin) {
      console.log('Checkin页面：用户未登录，提交打卡时自动登录');
      
      wx.showModal({
        title: '需要登录',
        content: '提交打卡需要先登录，是否立即登录？',
        confirmText: '立即登录',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 先进行登录
              await this.oneClickLogin();
              
              // 登录成功后自动提交打卡
              setTimeout(() => {
                if (this.data.isLogin) {
                  console.log('Checkin页面：登录成功，自动提交打卡');
                  this.doSubmitCheckin();
                }
              }, 1000);
            } catch (error) {
              console.error('Checkin页面：登录失败，无法提交打卡:', error);
            }
          }
        }
      });
      return;
    }

    // 如果已登录，直接提交
    this.doSubmitCheckin();
  },

  // 执行提交打卡的具体逻辑
  doSubmitCheckin: async function() {
    if (this.data.submitting) return;
    
    this.setData({ submitting: true });

    try {
      wx.showLoading({ title: '提交中...' });

      // 准备提交数据
      const checkinData = {
        questions: this.data.questions.filter(q => q.trim() !== ''),
        diary: this.data.diary.trim(),
        mistakeImages: this.data.mistakeImages,
        images: this.data.images,
        date: this.data.currentDate
      };

      // 调用云函数提交打卡
      const result = await CloudApi.submitCheckin(checkinData);
      
      if (result.success) {
        // 清除草稿
        wx.removeStorageSync('checkin_draft');
        
        // 重置表单
        this.setData({
          questions: [''],
          diary: '',
          mistakeImages: [],
          images: [],
          showSuccessToast: true
        });

        // 隐藏成功提示
        setTimeout(() => {
          this.setData({ showSuccessToast: false });
        }, 2000);

        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交打卡失败:', error);
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  }
})