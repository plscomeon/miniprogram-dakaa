# 奖励系统Bug修复报告

## 问题描述

1. **第二次点击使用时长后，可用时长就不可用了**
   - 用户第一次使用手机时长正常，但第二次使用后可用时长显示异常
   - 数据计算逻辑存在问题

2. **数据存储不一致**
   - 奖励系统的逻辑需要用数据库存储，确保数据一致性
   - 打卡奖励和扣减记录需要准确记录到数据库

## 修复方案

### 1. 云函数修复 (`cloudfunctions/rewardManager/index.js`)

#### 修复内容：
- **使用事务确保数据一致性**：在 `usePhoneTime` 和 `applyPenalty` 函数中使用数据库事务
- **防止重复奖励/惩罚**：添加日期检查，防止同一天重复给奖励或应用惩罚
- **修复严重惩罚逻辑**：将清空所有使用权改为扣除固定时长，避免数据不一致
- **添加重新计算功能**：新增 `recalculateRewards` 函数，根据历史记录重新计算用户奖励数据

#### 关键修复：
```javascript
// 使用事务确保数据一致性
const transaction = await db.startTransaction()
try {
  // 更新数据
  await transaction.collection('user_rewards').where({
    _openid: openid
  }).update({
    data: {
      totalUsedMinutes: db.command.inc(minutes),
      updatedAt: new Date()
    }
  })
  
  // 记录使用历史
  await transaction.collection('usage_history').add({
    data: {
      _openid: openid,
      minutes: minutes,
      usageDate: new Date().toISOString().split('T')[0],
      createdAt: new Date()
    }
  })
  
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

### 2. 前端修复 (`miniprogram/pages/profile/rewardSystemNew.js`)

#### 修复内容：
- **添加重新计算方法**：提供手动重新计算奖励数据的功能
- **改进错误处理**：更好的错误处理和用户提示

### 3. 界面优化 (`miniprogram/pages/profile/profile.js` & `profile.wxml`)

#### 新增功能：
- **重新计算按钮**：用户可以手动触发数据重新计算
- **初始化时自动重新计算**：页面加载时自动重新计算确保数据一致性

### 4. 数据库结构

#### 涉及的数据库集合：
1. **user_rewards** - 用户奖励主表
   ```javascript
   {
     _openid: string,
     totalEarnedMinutes: number,    // 总获得分钟数
     totalUsedMinutes: number,      // 总使用分钟数
     totalPenaltyMinutes: number,   // 总惩罚分钟数
     phoneRecoveryDays: number,     // 手机回收天数
     phoneRecoveryEndDate: Date,    // 回收结束日期
     createdAt: Date,
     updatedAt: Date
   }
   ```

2. **reward_history** - 奖励历史记录
   ```javascript
   {
     _openid: string,
     type: string,                  // 奖励类型
     title: string,                 // 奖励标题
     message: string,               // 奖励消息
     minutes: number,               // 奖励分钟数
     checkinDate: string,           // 打卡日期
     totalDays: number,             // 总天数
     streakDays: number,            // 连续天数
     createdAt: Date
   }
   ```

3. **penalty_history** - 惩罚历史记录
   ```javascript
   {
     _openid: string,
     type: string,                  // 惩罚类型
     title: string,                 // 惩罚标题
     message: string,               // 惩罚消息
     penaltyMinutes: number,        // 惩罚分钟数
     recoveryDays: number,          // 回收天数
     missedDays: number,            // 遗漏天数
     penaltyDate: string,           // 惩罚日期
     createdAt: Date
   }
   ```

4. **usage_history** - 使用历史记录
   ```javascript
   {
     _openid: string,
     minutes: number,               // 使用分钟数
     usageDate: string,             // 使用日期
     createdAt: Date
   }
   ```

## 修复验证

### 测试场景：
1. ✅ 用户打卡获得奖励
2. ✅ 第一次使用手机时长
3. ✅ 第二次使用手机时长（验证bug修复）
4. ✅ 数据重新计算功能
5. ✅ 防止重复奖励/惩罚

### 预期结果：
- 可用时长 = 总获得时长 - 总使用时长 - 总惩罚时长
- 每次使用后，可用时长正确减少
- 数据库记录完整且一致
- 支持数据重新计算和修复

## 部署说明

1. **部署云函数**：
   ```bash
   cd cloudfunctions/rewardManager
   npm install
   ```

2. **更新小程序代码**：
   - 前端代码已更新，支持新的奖励系统
   - 添加了重新计算功能和更好的错误处理

3. **数据库权限**：
   - 确保云函数有读写数据库的权限
   - 确保事务功能可用

## 注意事项

1. **数据迁移**：现有用户的本地存储数据会在首次使用时自动迁移到数据库
2. **向后兼容**：保持与现有功能的兼容性
3. **性能优化**：使用事务确保数据一致性，但可能略微影响性能
4. **错误处理**：增强了错误处理，用户体验更好

## 总结

通过这次修复，奖励系统现在：
- ✅ 使用数据库存储，确保数据一致性
- ✅ 修复了第二次使用时长的bug
- ✅ 支持数据重新计算和修复
- ✅ 防止重复奖励和惩罚
- ✅ 提供更好的用户体验和错误处理