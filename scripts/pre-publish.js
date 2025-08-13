#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Running pre-publish checks...');

// 检查package.json
try {
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  console.log('✅ Package info:');
  console.log(`   Name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  console.log(`   Author: ${packageJson.author.name}`);
  console.log(`   Repository: ${packageJson.repository.url}`);
  
  // 检查必要字段
  const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'author', 'license', 'repository'];
  const missingFields = requiredFields.filter(field => !packageJson[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Missing required fields:', missingFields.join(', '));
    process.exit(1);
  }
  
  // 检查bin文件是否存在
  const binPath = join(__dirname, '..', packageJson.bin['hearthstone-decks-mcp']);
  try {
    readFileSync(binPath, 'utf8');
    console.log('✅ Binary file exists');
  } catch (error) {
    console.error('❌ Binary file not found:', binPath);
    process.exit(1);
  }
  
  // 检查主文件是否存在
  const mainPath = join(__dirname, '..', packageJson.main);
  try {
    readFileSync(mainPath, 'utf8');
    console.log('✅ Main file exists');
  } catch (error) {
    console.error('❌ Main file not found:', mainPath);
    process.exit(1);
  }
  
  console.log('✅ All pre-publish checks passed!');
  console.log('');
  console.log('📦 Ready to publish with:');
  console.log('   npm publish');
  console.log('');
  console.log('🚀 After publishing, users can install with:');
  console.log(`   npm install -g ${packageJson.name}`);
  
} catch (error) {
  console.error('❌ Error during pre-publish checks:', error.message);
  process.exit(1);
}
