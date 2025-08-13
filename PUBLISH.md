# 发布指南

## 发布前准备

### 1. 登录npm

```bash
npm login
```

确保使用正确的npm账户（yinshawnrao）。

### 2. 运行预检查

```bash
npm run precheck
```

这会检查：
- package.json的必要字段
- 文件完整性
- 版本信息

### 3. 运行测试

```bash
npm test
```

### 4. 检查文件列表

查看将要发布的文件：

```bash
npm pack --dry-run
```

## 发布步骤

### 1. 初次发布

```bash
npm publish
```

### 2. 更新版本发布

```bash
# 补丁版本 (1.0.0 -> 1.0.1)
npm version patch
npm publish

# 小版本 (1.0.0 -> 1.1.0)  
npm version minor
npm publish

# 大版本 (1.0.0 -> 2.0.0)
npm version major
npm publish
```

## 发布后验证

### 1. 检查npm包页面

访问：https://www.npmjs.com/package/hearthstone-decks-mcp

### 2. 全局安装测试

```bash
npm install -g hearthstone-decks-mcp
hearthstone-decks-mcp --help
```

### 3. MCP配置测试

在Cursor中配置：

```json
{
  "mcpServers": {
    "hearthstone-decks": {
      "command": "npx",
      "args": ["hearthstone-decks-mcp"]
    }
  }
}
```

## 常见问题

### 权限错误

如果遇到权限问题：

```bash
npm login
# 重新输入用户名和密码
```

### 版本冲突

如果版本已存在：

```bash
npm version patch  # 自动增加版本号
npm publish
```

### 文件缺失

检查package.json的files字段，确保包含所有必要文件。

## 发布检查清单

- [ ] npm login 已完成
- [ ] 运行 npm run precheck 通过
- [ ] 运行 npm test 通过  
- [ ] README.md 信息完整
- [ ] package.json 信息正确
- [ ] LICENSE 文件存在
- [ ] .npmignore 配置正确
- [ ] 版本号合适

## 版本管理

遵循语义化版本号：

- **补丁版本** (1.0.X): Bug修复
- **小版本** (1.X.0): 新功能，向后兼容
- **大版本** (X.0.0): 破坏性更改

## 发布后推广

1. 更新GitHub README
2. 创建GitHub Release
3. 在社区分享（如Discord、Reddit等）
4. 撰写博客文章
