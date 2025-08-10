# 技术实现方案

## 项目结构

```
miniprogram-dakaa/
├── pages/                  # 页面目录
│   ├── index/             # 今日打卡页
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.js
│   │   └── index.json
│   ├── history/           # 历史记录页
│   │   ├── history.wxml
│   │   ├── history.wxss
│   │   ├── history.js
│   │   └── history.json
│   └── profile/           # 用户中心页
│       ├── profile.wxml
│       ├── profile.wxss
│       ├── profile.js
│       └── profile.json
├── components/            # 自定义组件
│   ├── card/             # 卡片组件
│   ├── upload/           # 上传组件
│   ├── calendar/         # 日历组件
│   └── input/            # 输入框组件
├── utils/                # 工具函数
│   ├── api.js           # API接口
│   ├── storage.js       # 本地存储
│   ├── upload.js        # 上传工具
│   └── date.js          # 日期工具
├── styles/               # 全局样式
│   └── common.wxss
├── app.js               # 小程序入口
├── app.json             # 全局配置
└── app.wxss             # 全局样式
```

## 核心功能实现

### 1. 数据模型设计

#### 打卡记录模型
```javascript
const CheckInRecord = {
  id: String,           // 记录ID
  userId: String,       // 用户ID
  date: String,         // 打卡日期 YYYY-MM-DD
  questions: Array,     // 预习问题列表
  videoUrl: String,     // 视频URL
  videoCover: String,   // 视频封面URL
  diary: String,        // 学习日记内容
  images: Array,        // 图片URL列表
  createdAt: Date,      // 创建时间
  updatedAt: Date       // 更新时间
}
```

#### 用户模型
```javascript
const User = {
  id: String,           // 用户ID
  openid: String,       // 微信openid
  nickname: String,     // 昵称
  avatar: String,       // 头像URL
  totalDays: Number,    // 总打卡天数
  continuousDays: Number, // 连续打卡天数
  createdAt: Date,      // 注册时间
  lastCheckIn: Date     // 最后打卡时间
}
```

### 2. API接口设计

#### 用户相关
```javascript
// 微信登录
POST /api/auth/login
Body: { code: String }
Response: { token: String, user: User }

// 获取用户信息
GET /api/user/profile
Headers: { Authorization: Bearer token }
Response: { user: User }
```

#### 打卡相关
```javascript
// 提交打卡记录
POST /api/checkin
Body: CheckInRecord
Response: { success: Boolean, data: CheckInRecord }

// 获取打卡记录列表
GET /api/checkin/list?year=2025&month=1
Response: { data: Array<CheckInRecord> }

// 获取单日打卡记录
GET /api/checkin/detail?date=2025-01-20
Response: { data: CheckInRecord }
```

#### 文件上传
```javascript
// 上传图片
POST /api/upload/image
Body: FormData
Response: { url: String }

// 上传视频
POST /api/upload/video
Body: FormData
Response: { url: String, cover: String }
```

### 3. 关键组件实现

#### 上传组件 (components/upload/upload.js)
```javascript
Component({
  properties: {
    type: {
      type: String,
      value: 'image' // image | video
    },
    maxSize: {
      type: Number,
      value: 10 * 1024 * 1024 // 10MB
    }
  },
  
  data: {
    uploading: false,
    progress: 0
  },
  
  methods: {
    chooseFile() {
      const { type } = this.properties;
      
      if (type === 'image') {
        this.chooseImage();
      } else if (type === 'video') {
        this.chooseVideo();
      }
    },
    
    chooseImage() {
      wx.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadFiles(res.tempFilePaths);
        }
      });
    },
    
    chooseVideo() {
      wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 300, // 5分钟
        success: (res) => {
          this.uploadFiles([res.tempFilePath]);
        }
      });
    },
    
    uploadFiles(filePaths) {
      this.setData({ uploading: true });
      
      const uploadPromises = filePaths.map(filePath => {
        return new Promise((resolve, reject) => {
          wx.uploadFile({
            url: `${app.globalData.apiBase}/upload/${this.properties.type}`,
            filePath,
            name: 'file',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: (res) => {
              const data = JSON.parse(res.data);
              resolve(data.url);
            },
            fail: reject
          });
        });
      });
      
      Promise.all(uploadPromises)
        .then(urls => {
          this.triggerEvent('success', { urls });
        })
        .catch(error => {
          this.triggerEvent('error', { error });
        })
        .finally(() => {
          this.setData({ uploading: false });
        });
    }
  }
});
```

#### 日历组件 (components/calendar/calendar.js)
```javascript
Component({
  properties: {
    checkInDates: {
      type: Array,
      value: []
    }
  },
  
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarData: []
  },
  
  lifetimes: {
    attached() {
      this.generateCalendar();
    }
  },
  
  methods: {
    generateCalendar() {
      const { currentYear, currentMonth } = this.data;
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      const daysInMonth = lastDay.getDate();
      const startWeekday = firstDay.getDay();
      
      const calendarData = [];
      let week = [];
      
      // 填充月初空白
      for (let i = 0; i < startWeekday; i++) {
        week.push({ day: '', isEmpty: true });
      }
      
      // 填充日期
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasCheckIn = this.data.checkInDates.includes(dateStr);
        
        week.push({
          day,
          dateStr,
          hasCheckIn,
          isToday: this.isToday(currentYear, currentMonth - 1, day)
        });
        
        if (week.length === 7) {
          calendarData.push(week);
          week = [];
        }
      }
      
      // 填充月末空白
      while (week.length < 7 && week.length > 0) {
        week.push({ day: '', isEmpty: true });
      }
      if (week.length > 0) {
        calendarData.push(week);
      }
      
      this.setData({ calendarData });
    },
    
    isToday(year, month, day) {
      const today = new Date();
      return year === today.getFullYear() && 
             month === today.getMonth() && 
             day === today.getDate();
    },
    
    onDateTap(e) {
      const { datestr, hascheckIn } = e.currentTarget.dataset;
      if (hasCheckIn) {
        this.triggerEvent('dateselect', { date: dateStr });
      }
    },
    
    prevMonth() {
      let { currentYear, currentMonth } = this.data;
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      this.setData({ currentYear, currentMonth });
      this.generateCalendar();
      this.triggerEvent('monthchange', { year: currentYear, month: currentMonth });
    },
    
    nextMonth() {
      let { currentYear, currentMonth } = this.data;
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      this.setData({ currentYear, currentMonth });
      this.generateCalendar();
      this.triggerEvent('monthchange', { year: currentYear, month: currentMonth });
    }
  }
});
```

### 4. 数据存储方案

#### 本地存储
```javascript
// utils/storage.js
class Storage {
  // 保存草稿
  saveDraft(data) {
    wx.setStorageSync('draft', {
      ...data,
      timestamp: Date.now()
    });
  }
  
  // 获取草稿
  getDraft() {
    const draft = wx.getStorageSync('draft');
    if (draft && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
      return draft;
    }
    return null;
  }
  
  // 清除草稿
  clearDraft() {
    wx.removeStorageSync('draft');
  }
  
  // 缓存打卡记录
  cacheCheckInRecords(year, month, records) {
    const key = `checkin_${year}_${month}`;
    wx.setStorageSync(key, {
      records,
      timestamp: Date.now()
    });
  }
  
  // 获取缓存的打卡记录
  getCachedCheckInRecords(year, month) {
    const key = `checkin_${year}_${month}`;
    const cached = wx.getStorageSync(key);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.records;
    }
    return null;
  }
}

export default new Storage();
```

#### 云端存储
- 使用微信云开发数据库
- 集合设计：users, checkin_records
- 支持实时数据同步

### 5. 性能优化策略

#### 图片优化
```javascript
// 图片压缩
function compressImage(filePath) {
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => resolve(res.tempFilePath),
      fail: () => resolve(filePath)
    });
  });
}
```

#### 懒加载
```javascript
// 历史记录懒加载
loadMoreRecords() {
  if (this.data.loading || !this.data.hasMore) return;
  
  this.setData({ loading: true });
  
  api.getCheckInRecords({
    page: this.data.page + 1,
    limit: 10
  }).then(res => {
    this.setData({
      records: [...this.data.records, ...res.data],
      page: this.data.page + 1,
      hasMore: res.data.length === 10,
      loading: false
    });
  });
}
```

### 6. 错误处理机制

```javascript
// 全局错误处理
App({
  onError(error) {
    console.error('小程序错误:', error);
    // 上报错误日志
    this.reportError(error);
  },
  
  reportError(error) {
    wx.request({
      url: `${this.globalData.apiBase}/error/report`,
      method: 'POST',
      data: {
        error: error.toString(),
        stack: error.stack,
        timestamp: Date.now(),
        userAgent: wx.getSystemInfoSync()
      }
    });
  }
});