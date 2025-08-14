# 云函数目录结构修复

## 问题描述

云函数 `rewardManager` 被错误地放置在了 `miniprogram/cloudfunctions/` 目录下，但在微信小程序项目中，云函数应该放在**项目根目录**下的 `cloudfunctions/` 文件夹中。

## 修复前的目录结构

```
miniprogram-dakaa/
├── cloudfunctions/                    # ✅ 正确的云函数目录
│   ├── checkinManager/
│   ├── fileUpload/
│   ├── quickstartFunctions/
│   └── userManager/
└── miniprogram/
    ├── cloudfunctions/                # ❌ 错误的云函数目录
    │   ├── checkinManager/
    │   ├── fileUpload/
    │   ├── mistakesManager/
    │   ├── rewardManager/             # ❌ 位置错误
    │   └── userManager/
    └── ...
```

## 修复后的目录结构

```
miniprogram-dakaa/
├── cloudfunctions/                    # ✅ 正确的云函数目录
│   ├── checkinManager/
│   ├── fileUpload/
│   ├── quickstartFunctions/
│   ├── rewardManager/                 # ✅ 已移动到正确位置
│   └── userManager/
└── miniprogram/
    ├── cloudfunctions/                # 保留其他云函数
    │   ├── checkinManager/
    │   ├── fileUpload/
    │   ├── mistakesManager/
    │   └── userManager/
    └── ...
```

## 修复步骤

1. **创建正确位置的云函数**：
   - 在 `cloudfunctions/rewardManager/` 创建 `index.js`
   - 在 `cloudfunctions/rewardManager/` 创建 `package.json`

2. **安装依赖**：
   ```bash
   cd cloudfunctions/rewardManager
   npm install
   ```

3. **删除错误位置的文件**：
   ```bash
   rm -rf miniprogram/cloudfunctions/rewardManager
   ```

## 微信小程序云函数目录规范

在微信小程序项目中：

- **`cloudfunctions/`** - 存放云函数代码（项目根目录下）
- **`miniprogram/`** - 存放小程序前端代码

### 正确的项目结构：

```
your-miniprogram-project/
├── cloudfunctions/           # 云函数目录
│   ├── function1/
│   │   ├── index.js
│   │   └── package.json
│   └── function2/
│       ├── index.js
│       └── package.json
├── miniprogram/             # 小程序前端代码
│   ├── pages/
│   ├── utils/
│   ├── app.js
│   ├── app.json
│   └── app.wxss
└── project.config.json      # 项目配置文件
```

## 验证修复

修复后，云函数目录结构应该是：

- ✅ `cloudfunctions/rewardManager/` - 奖励系统云函数
- ✅ 依赖已正确安装
- ✅ 可以正常部署和调用

## 注意事项

1. **部署云函数时**，确保在正确的目录下操作
2. **微信开发者工具**会自动识别 `cloudfunctions/` 目录下的云函数
3. **project.config.json** 中的 `cloudfunctionRoot` 配置应该指向 `cloudfunctions/`

现在奖励系统云函数已经在正确的位置，可以正常部署和使用了！