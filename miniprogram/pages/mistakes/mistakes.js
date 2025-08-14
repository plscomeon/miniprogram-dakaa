// pages/mistakes/mistakes.js
const app = getApp()
const dayjs = require("dayjs")

Page({
  data: {
    mistakes: [],
    showInputCard: false,
    newMistake: '',
    characterCount: 0,
    maxCharacters: 500
  },

  onLoad: function () {
    this.loadMistakes();
  },

  loadMistakes: async function () {
    const res = await wx.cloud.callFunction({
      name: 'mistakesManager',
      data: { action: 'get' }
    });
    this.setData({ mistakes: res.result.data.map(m => ({...m, date: dayjs(m.date).format('YYYY-MM-DD')})) });
  },

  showInputCard: function () {
    this.setData({ showInputCard: true });
  },

  hideInputCard: function () {
    this.setData({ 
      showInputCard: false, 
      newMistake: '',
      characterCount: 0
    });
  },

  onInput: function (e) {
    const value = e.detail.value;
    const count = value.length;
    
    this.setData({ 
      newMistake: value,
      characterCount: count
    });
    
    // 实时检查字符数限制
    if (count > this.data.maxCharacters) {
      wx.showToast({
        title: `字符数不能超过${this.data.maxCharacters}`,
        icon: 'none',
        duration: 1000
      });
    }
  },
  hideInputCard: function () {
    this.setData({ 
      showInputCard: false, 
      newMistake: '',
      characterCount: 0
    });
  },

  saveMistake: async function () {
    // 输入框检查逻辑
    const content = this.data.newMistake.trim();
    
    // 检查是否为空
    if (!content) {
      wx.showToast({
        title: '请输入错题内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查内容长度
    if (content.length < 5) {
      wx.showToast({
        title: '错题内容至少需要5个字符',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (content.length > 500) {
      wx.showToast({
        title: '错题内容不能超过500个字符',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查是否包含敏感词（简单示例）
    const sensitiveWords = ['测试敏感词', '违规内容'];
    const hasSensitiveWord = sensitiveWords.some(word => content.includes(word));
    if (hasSensitiveWord) {
      wx.showToast({
        title: '内容包含不当词汇，请修改',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      await wx.cloud.callFunction({
        name: 'mistakesManager',
        data: {
          action: 'add',
          content: content
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });

      this.hideInputCard();
      this.loadMistakes();
    } catch (error) {
      wx.hideLoading();
      console.error('保存错题失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  }
});