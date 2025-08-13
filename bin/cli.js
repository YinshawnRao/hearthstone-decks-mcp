#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取主程序路径
const mainScript = join(__dirname, '..', 'index.js');

// 解析命令行参数
const args = process.argv.slice(2);

// 默认参数
const defaultArgs = ['--transport=stdio'];

// 合并参数
const finalArgs = [...defaultArgs, ...args];

// 启动主程序
const child = spawn('node', [mainScript, ...finalArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
  }
});

// 处理退出
child.on('exit', (code) => {
  process.exit(code);
});

// 处理错误
child.on('error', (error) => {
  console.error('Error starting Hearthstone Decks MCP Server:', error.message);
  process.exit(1);
});

// 处理信号
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
