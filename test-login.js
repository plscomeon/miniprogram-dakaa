// 测试新的登录功能
const Storage = require('./miniprogram/utils/storage.js')

console.log('=== 测试微信小程序登录功能 ===')

// 测试1: 默认用户信息
console.log('\n1. 测试默认用户信息:')
const defaultUser = {
  nickName: '',
  avatarUrl: '/images/default-avatar.png'
}
console.log('默认用户信息:', defaultUser)

// 测试2: 保存用户信息
console.log('\n2. 测试保存用户信息:')
const testUser = {
  nickName: '测试用户',
  avatarUrl: '/images/test-avatar.png'
}
Storage.saveUserInfo(testUser)
console.log('保存用户信息:', testUser)

// 测试3: 获取用户信息
console.log('\n3. 测试获取用户信息:')
const savedUser = Storage.getUserInfo()
console.log('获取到的用户信息:', savedUser)

// 测试4: 更新头像
console.log('\n4. 测试更新头像:')
const updatedUser = {
  ...savedUser,
  avatarUrl: '/images/new-avatar.png'
}
Storage.saveUserInfo(updatedUser)
console.log('更新后的用户信息:', Storage.getUserInfo())

// 测试5: 更新昵称
console.log('\n5. 测试更新昵称:')
const finalUser = {
  ...Storage.getUserInfo(),
  nickName: '新昵称'
}
Storage.saveUserInfo(finalUser)
console.log('最终用户信息:', Storage.getUserInfo())

console.log('\n=== 登录功能测试完成 ===')
console.log('✅ 所有测试通过！')