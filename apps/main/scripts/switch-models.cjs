#!/usr/bin/env node

//scripts/switch-models.js

const fs = require('fs');
const path = require('path');

// Path to the models config file
const CONFIG_PATH = path.join(__dirname, '../src/config/models.config.ts');

// Available model packs
const AVAILABLE_PACKS = [
  'starter-pack-1',
  'performance-pack', 
  'mixed-pack',
  'claude-pack',
  'haiku-pack'
];

// Pack descriptions
const PACK_DESCRIPTIONS = {
  'starter-pack-1': 'GPT-4o-mini for everything - fast and cost-effective',
  'performance-pack': 'GPT-4o for core functions, optimized for quality',
  'mixed-pack': 'O1-mini for brain, GPT-4o for vision, Claude for code',
  'claude-pack': 'Claude 3.5 Sonnet for everything - excellent for code',
  'haiku-pack': 'Claude 3.5 Haiku for speed and cost efficiency'
};

function getCurrentPack() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    const match = content.match(/export const ACTIVE_MODEL_PACK = '([^']+)'/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('❌ Error reading config file:', error.message);
    process.exit(1);
  }
}

function setPack(packName) {
  if (!AVAILABLE_PACKS.includes(packName)) {
    console.error(`❌ Invalid pack: ${packName}`);
    console.log(`📦 Available packs: ${AVAILABLE_PACKS.join(', ')}`);
    process.exit(1);
  }

  try {
    let content = fs.readFileSync(CONFIG_PATH, 'utf8');
    content = content.replace(
      /export const ACTIVE_MODEL_PACK = '[^']+'/,
      `export const ACTIVE_MODEL_PACK = '${packName}'`
    );
    fs.writeFileSync(CONFIG_PATH, content);
    console.log(`✅ Switched to model pack: ${packName}`);
    console.log(`📝 ${PACK_DESCRIPTIONS[packName]}`);
  } catch (error) {
    console.error('❌ Error updating config file:', error.message);
    process.exit(1);
  }
}

function listPacks() {
  const currentPack = getCurrentPack();
  console.log('📦 Available Model Packs:\n');
  
  AVAILABLE_PACKS.forEach(pack => {
    const isCurrent = pack === currentPack;
    const indicator = isCurrent ? '👉 ' : '   ';
    const description = PACK_DESCRIPTIONS[pack];
    console.log(`${indicator}${pack}: ${description}`);
  });
  
  if (currentPack) {
    console.log(`\n🎯 Current pack: ${currentPack}`);
  }
}

function showHelp() {
  console.log(`
🤖 Model Pack Switcher

USAGE:
  node scripts/switch-models.js <command>

COMMANDS:
  list                    List available model packs
  current                 Show current active pack
  <pack-name>            Switch to specified pack
  help                   Show this help

EXAMPLES:
  node scripts/switch-models.js list
  node scripts/switch-models.js claude-pack
  node scripts/switch-models.js performance-pack

AVAILABLE PACKS:
  ${AVAILABLE_PACKS.map(pack => `- ${pack}: ${PACK_DESCRIPTIONS[pack]}`).join('\n  ')}
`);
}

// Main CLI logic
const command = process.argv[2];

switch (command) {
  case 'list':
    listPacks();
    break;
    
  case 'current':
    const current = getCurrentPack();
    if (current) {
      console.log(`🎯 Current pack: ${current}`);
      console.log(`📝 ${PACK_DESCRIPTIONS[current]}`);
    } else {
      console.log('❌ No active pack found');
    }
    break;
    
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
    
  default:
    if (AVAILABLE_PACKS.includes(command)) {
      setPack(command);
    } else {
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
    }
}
