// 云函数部署检查脚本
// 在微信开发者工具控制台运行

console.log('=== 云函数部署检查 ===')

// 检查云函数是否部署
async function checkCloudFunction() {
  try {
    console.log('正在检查 rewardManager 云函数...')
    
    // 尝试调用云函数
    const result = await wx.cloud.callFunction({
      name: 'rewardManager',
      data: {
        action: 'getUserRewards'
      }
    })
    
    console.log('✅ 云函数调用成功!')
    console.log('返回结果:', result.result)
    
    return { deployed: true, result: result.result }
  } catch (error) {
    console.error('❌ 云函数调用失败:', error)
    
    if (error.errMsg && error.errMsg.includes('cloud function not found')) {
      console.log('🔧 解决方案: 需要部署 rewardManager 云函数')
      console.log('步骤:')
      console.log('1. 右键点击 cloudfunctions/rewardManager 文件夹')
      console.log('2. 选择 "上传并部署：云端安装依赖"')
      console.log('3. 等待部署完成')
    } else if (error.errMsg && error.errMsg.includes('network')) {
      console.log('🌐 网络问题，请检查网络连接')
    } else {
      console.log('❓ 其他错误:', error.errMsg)
    }
    
    return { deployed: false, error: error.errMsg }
  }
}

// 测试手机使用功能
async function testPhoneUsage() {
  try {
    console.log('=== 测试手机使用功能 ===')
    
    const result = await wx.cloud.callFunction({
      name: 'rewardManager',
      data: {
        action: 'usePhoneTime',
        data: { minutes: 60 }
      }
    })
    
    console.log('手机使用测试结果:', result.result)
    return result.result
  } catch (error) {
    console.error('手机使用测试失败:', error)
    return { success: false, error: error.errMsg }
  }
}

// 运行完整检查
async function runFullCheck() {
  console.log('开始完整检查...')
  
  const cloudCheck = await checkCloudFunction()
  
  if (cloudCheck.deployed) {
    console.log('云函数已部署，测试手机使用功能...')
    const usageTest = await testPhoneUsage()
    
    return {
      cloudFunction: cloudCheck,
      phoneUsage: usageTest,
      status: usageTest.success ? 'all_good' : 'usage_failed'
    }
  } else {
    return {
      cloudFunction: cloudCheck,
      phoneUsage: null,
      status: 'need_deploy'
    }
  }
}

// 导出函数
if (typeof window !== 'undefined') {
  window.checkCloudFunction = checkCloudFunction
  window.testPhoneUsage = testPhoneUsage
  window.runFullCheck = runFullCheck
  
  console.log('检查函数已加载，可以运行:')
  console.log('- checkCloudFunction() // 检查云函数部署')
  console.log('- testPhoneUsage() // 测试手机使用')
  console.log('- runFullCheck() // 运行完整检查')
  
  // 自动运行检查
  runFullCheck().then(result => {
    console.log('=== 检查完成 ===')
    console.log('结果:', result)
    
    if (result.status === 'all_good') {
      console.log('🎉 一切正常！可以正常使用手机时长功能')
    } else if (result.status === 'need_deploy') {
      console.log('⚠️ 需要部署云函数才能正常使用')
    } else {
      console.log('⚠️ 云函数已部署但功能异常，请检查代码')
    }
  })
}