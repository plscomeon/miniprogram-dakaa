// 测试奖励系统和学习成就位置交换
const fs = require('fs');

console.log('🔄 测试奖励系统和学习成就位置交换...\n');

try {
  // 读取WXML文件内容
  const wxml = fs.readFileSync('miniprogram/pages/profile/profile.wxml', 'utf8');
  
  // 查找成就系统和奖励系统的位置
  const achievementIndex = wxml.indexOf('<!-- 成就系统 -->');
  const rewardIndex = wxml.indexOf('<!-- 奖励系统 -->');
  
  console.log('📍 位置检查:');
  console.log(`   成就系统位置: ${achievementIndex}`);
  console.log(`   奖励系统位置: ${rewardIndex}`);
  
  // 验证位置交换是否成功
  if (achievementIndex < rewardIndex) {
    console.log('✅ 位置交换成功！学习成就现在在奖励系统之前');
    
    // 检查具体的布局顺序
    const lines = wxml.split('\n');
    let achievementLine = -1;
    let rewardLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<!-- 成就系统 -->')) {
        achievementLine = i + 1;
      }
      if (lines[i].includes('<!-- 奖励系统 -->')) {
        rewardLine = i + 1;
      }
    }
    
    console.log('\n📋 详细布局顺序:');
    console.log(`   1. 用户信息卡片`);
    console.log(`   2. 数据统计`);
    console.log(`   3. 🏆 学习成就 (第${achievementLine}行)`);
    console.log(`   4. 🎁 奖励系统 (第${rewardLine}行)`);
    console.log(`   5. 功能菜单`);
    console.log(`   6. 设置选项`);
    
    // 验证成就系统的内容
    const achievementSection = wxml.substring(
      wxml.indexOf('<!-- 成就系统 -->'),
      wxml.indexOf('<!-- 奖励系统 -->')
    );
    
    if (achievementSection.includes('🏆 学习成就') && 
        achievementSection.includes('achievement-card') &&
        achievementSection.includes('achievement-list')) {
      console.log('✅ 学习成就模块内容完整');
    } else {
      console.log('❌ 学习成就模块内容不完整');
    }
    
    // 验证奖励系统的内容
    const rewardSection = wxml.substring(
      wxml.indexOf('<!-- 奖励系统 -->'),
      wxml.indexOf('<!-- 功能菜单 -->')
    );
    
    if (rewardSection.includes('🎁 奖励系统') && 
        rewardSection.includes('reward-system-card') &&
        rewardSection.includes('phone-usage-status')) {
      console.log('✅ 奖励系统模块内容完整');
    } else {
      console.log('❌ 奖励系统模块内容不完整');
    }
    
  } else {
    console.log('❌ 位置交换失败！奖励系统仍在学习成就之前');
  }
  
  console.log('\n🎯 交换效果:');
  console.log('   - 用户进入"我的"页面时，首先看到学习成就');
  console.log('   - 学习成就作为激励展示在更显眼的位置');
  console.log('   - 奖励系统作为功能性模块放在后面');
  console.log('   - 整体布局更符合用户关注度优先级');
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
}

console.log('\n✅ 位置交换测试完成！');