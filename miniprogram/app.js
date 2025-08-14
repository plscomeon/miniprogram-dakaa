// app.js
const CloudApi = require('./utils/cloudApi.js');

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）的默认环境配置
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        env: 'cloud1-9gz1gny27ca24d31', // 您的真实云环境ID
        traceUser: true,
      });
      console.log('云开发初始化成功，环境ID: cloud1-9gz1gny27ca24d31');
    }

    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      isLoggedIn: false
    };

    // 启动时检查用户登录状态
    this.checkUserLogin();
  },

  // 检查用户登录状态
  checkUserLogin: async function() {
    try {
      console.log('App启动：开始检查用户登录状态...');
      
      // 首先尝试从本地存储获取用户信息
      const localUserInfo = wx.getStorageSync('userInfo');
      const localIsLoggedIn = wx.getStorageSync('isLoggedIn');
      
      console.log('App启动：本地存储用户信息:', localUserInfo);
      console.log('App启动：本地存储登录状态:', localIsLoggedIn);
      
      if (localUserInfo && localUserInfo.nickName && localUserInfo.nickName.trim() !== '') {
        // 确保头像URL正确
        let avatarUrl = localUserInfo.avatarUrl || '/images/default-avatar.png';
        if (avatarUrl.startsWith('http://')) {
          avatarUrl = avatarUrl.replace('http://', 'https://');
        }
        
        const validUserInfo = {
          ...localUserInfo,
          avatarUrl: avatarUrl
        };
        
        this.globalData.isLoggedIn = true;
        this.globalData.userInfo = validUserInfo;
        console.log('App启动：从本地存储获取到有效用户信息:', validUserInfo);
        
        // 后台异步更新用户信息，但不阻塞应用启动
        this.updateUserInfoInBackground();
        return;
      }
      
      // 如果本地没有有效信息，尝试从云端获取
      console.log('App启动：本地无有效用户信息，尝试从云端获取...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('云函数调用超时')), 5000);
      });
      
      const getUserInfoPromise = CloudApi.getUserInfo();
      const result = await Promise.race([getUserInfoPromise, timeoutPromise]);
      
      console.log('App启动：从云端获取用户信息结果:', result);
      
      if (result.success && result.data && result.data.nickName && result.data.nickName.trim() !== '') {
        // 确保用户信息完整且有效
        const userInfo = {
          ...result.data,
          avatarUrl: result.data.avatarUrl || '/images/default-avatar.png'
        };
        
        // 更新全局数据
        this.globalData.userInfo = userInfo;
        this.globalData.isLoggedIn = true;
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('isLoggedIn', true);
        
        console.log('App启动：用户已登录，用户信息已更新:', userInfo);
      } else {
        // 如果云端没有有效数据，则设置为未登录状态
        this.clearUserInfo();
        console.log('App启动：用户未登录或信息不完整，result:', result);
      }
    } catch (error) {
      console.error('App启动：检查用户登录状态失败:', error);
      
      // 如果是超时或404005错误，设置为未登录状态但不影响应用启动
      if (error.message && (error.message.includes('404005') || error.message.includes('超时'))) {
        console.log('App启动：云函数调用超时或不可用，设置为未登录状态');
      }
      
      this.clearUserInfo();
    }
  },

  // 后台异步更新用户信息
  updateUserInfoInBackground: async function() {
    try {
      console.log('App：开始后台更新用户信息...');
      const result = await CloudApi.getUserInfo();
      
      if (result.success && result.data && result.data.nickName && result.data.nickName.trim() !== '') {
        // 确保头像URL正确
        let avatarUrl = result.data.avatarUrl || '/images/default-avatar.png';
        if (avatarUrl.startsWith('http://')) {
          avatarUrl = avatarUrl.replace('http://', 'https://');
        }
        
        const userInfo = {
          ...result.data,
          avatarUrl: avatarUrl
        };
        
        // 检查是否有更新
        const currentUserInfo = this.globalData.userInfo;
        const hasUpdate = !currentUserInfo || 
                         currentUserInfo.nickName !== userInfo.nickName ||
                         currentUserInfo.avatarUrl !== userInfo.avatarUrl ||
                         currentUserInfo.updateTime !== userInfo.updateTime;
        
        if (hasUpdate) {
          this.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
          console.log('App：后台更新用户信息成功，有更新:', userInfo);
          
          // 通知页面更新
          this.notifyPagesUserInfoUpdate(userInfo);
        } else {
          console.log('App：后台检查用户信息，无更新');
        }
      }
    } catch (error) {
      console.log('App：后台更新用户信息失败:', error);
    }
  },

  // 设置用户信息
  setUserInfo: function(userInfo) {
    console.log('App：开始设置全局用户信息:', userInfo);
    
    if (userInfo && userInfo.nickName && userInfo.nickName.trim() !== '') {
      // 确保头像URL正确
      let avatarUrl = userInfo.avatarUrl || '/images/default-avatar.png';
      if (avatarUrl && !avatarUrl.startsWith('https://') && !avatarUrl.startsWith('/images/')) {
        if (avatarUrl.startsWith('http://')) {
          avatarUrl = avatarUrl.replace('http://', 'https://');
        } else {
          avatarUrl = '/images/default-avatar.png';
        }
      }
      
      // 确保用户信息完整
      const completeUserInfo = {
        nickName: userInfo.nickName.trim(),
        avatarUrl: avatarUrl,
        gender: userInfo.gender || 0,
        country: userInfo.country || '',
        province: userInfo.province || '',
        city: userInfo.city || '',
        language: userInfo.language || 'zh_CN',
        createTime: userInfo.createTime,
        updateTime: userInfo.updateTime || new Date()
      };
      
      // 更新全局数据
      this.globalData.userInfo = completeUserInfo;
      this.globalData.isLoggedIn = true;
      
      // 保存到本地存储
      try {
        wx.setStorageSync('userInfo', completeUserInfo);
        wx.setStorageSync('isLoggedIn', true);
        console.log('App：用户信息已保存到本地存储');
      } catch (error) {
        console.error('App：保存用户信息到本地存储失败:', error);
      }
      
      console.log('App：全局用户信息已更新:', this.globalData.userInfo);
      console.log('App：全局登录状态已更新:', this.globalData.isLoggedIn);
      
      // 通知所有页面更新用户信息
      this.notifyPagesUserInfoUpdate(completeUserInfo);
    } else {
      console.error('App：用户信息不完整，无法设置:', userInfo);
      this.clearUserInfo();
    }
  },

  // 清除用户信息
  clearUserInfo: function() {
    console.log('App：清除用户信息');
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    
    // 清除本地存储
    try {
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('isLoggedIn');
      console.log('App：本地存储已清除');
    } catch (error) {
      console.error('App：清除本地存储失败:', error);
    }
  },

  // 通知所有页面更新用户信息
  notifyPagesUserInfoUpdate: function(userInfo) {
    // 获取当前页面栈
    const pages = getCurrentPages();
    
    // 通知所有页面更新用户信息
    pages.forEach(page => {
      if (page.updateUserInfo && typeof page.updateUserInfo === 'function') {
        page.updateUserInfo(userInfo);
      }
    });
  },

  // 获取有效的用户信息（优先级：本地存储 > 全局状态）
  getValidUserInfo: function() {
    // 首先尝试从本地存储获取
    const localUserInfo = wx.getStorageSync('userInfo');
    if (localUserInfo && localUserInfo.nickName && localUserInfo.nickName !== '微信用户') {
      // 同步到全局状态
      this.globalData.userInfo = localUserInfo;
      this.globalData.isLoggedIn = true;
      return localUserInfo;
    }
    
    // 如果本地存储没有，使用全局状态
    if (this.globalData.isLoggedIn && this.globalData.userInfo && 
        this.globalData.userInfo.nickName && this.globalData.userInfo.nickName !== '微信用户') {
      return this.globalData.userInfo;
    }
    
    return null;
  },

  // 获取用户信息
  getUserInfo: function() {
    return this.globalData.userInfo;
  },

  // 检查是否已登录
  isUserLoggedIn: function() {
    return this.globalData.isLoggedIn;
  },

  // 全局错误处理
  onError: function(error) {
    console.error('小程序错误:', error);
  },

  // 页面未找到处理
  onPageNotFound: function(res) {
    console.log('页面未找到:', res);
    wx.reLaunch({
      url: '/pages/checkin/checkin'
    });
  }
});