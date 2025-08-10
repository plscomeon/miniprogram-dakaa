// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // API配置
      apiBase: 'https://your-api-domain.com/api', // 替换为实际的API地址
      version: '1.0.0',
      userInfo: null,
      // 云开发环境配置
      env: ""
    };

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
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