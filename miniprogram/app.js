// app.js
const Storage = require('./utils/storage.js');

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）的默认环境配置
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        // env: 'my-env-id',
        traceUser: true,
      });
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
  checkUserLogin: function() {
    try {
      const userInfo = Storage.getUserInfo();
      if (userInfo && userInfo.nickName) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLoggedIn = true;
        console.log('用户已登录:', userInfo);
      } else {
        this.globalData.isLoggedIn = false;
        console.log('用户未登录');
      }
    } catch (error) {
      console.error('检查用户登录状态失败:', error);
      this.globalData.isLoggedIn = false;
    }
  },

  // 设置用户信息
  setUserInfo: function(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    Storage.setUserInfo(userInfo);
    console.log('用户信息已更新:', userInfo);
  },

  // 获取用户信息
  getUserInfo: function() {
    return this.globalData.userInfo;
  },

  // 检查是否已登录
  isUserLoggedIn: function() {
    return this.globalData.isLoggedIn;
  }
});
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      // 验证token有效性
      wx.request({
        url: `${this.globalData.apiBase}/auth/verify`,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          if (res.data.success) {
            this.globalData.userInfo = res.data.userInfo;
          } else {
            // token无效，清除本地存储
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
          }
        },
        fail: () => {
          // 网络错误，保持当前状态
          console.log('网络错误，无法验证登录状态');
        }
      });
    }
  },

  // 全局错误处理
  onError(error) {
    console.error('小程序错误:', error);
    
    // 上报错误信息
    if (this.globalData.apiBase) {
      wx.request({
        url: `${this.globalData.apiBase}/error/report`,
        method: 'POST',
        data: {
          error: error.toString(),
          stack: error.stack,
          timestamp: Date.now(),
          userAgent: wx.getSystemInfoSync(),
          userInfo: this.globalData.userInfo
        }
      });
    }
  },

  // 页面未找到处理
  onPageNotFound(res) {
    console.log('页面未找到:', res);
    wx.reLaunch({
      url: '/pages/checkin/checkin'
    });
  }
});