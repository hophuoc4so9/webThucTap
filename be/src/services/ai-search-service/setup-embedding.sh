#!/bin/bash

# 🚀 AI Search Service - Local Embedding Setup Script
# Tự động tải model embedding về máy local

echo "================================"
echo "  AI Search - Embedding Setup"
echo "================================"
echo ""

cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "📥 Downloading embedding model (first time only)..."
echo "   Model: Xenova/multilingual-e5-small"
echo "   Size: ~1.5GB"
echo "   Location: ~/.cache/huggingface/hub/"
echo ""
echo "⏳ This may take 5-10 minutes..."
echo ""

# Download model
node -e "
const { pipeline } = require('@xenova/transformers');
(async () => {
  try {
    console.log('⬇️  Fetching model from Hugging Face...');
    const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
    console.log('✅ Model downloaded successfully!');
    
    // Test it
    console.log('');
    console.log('🧪 Testing model...');
    const result = await extractor('Kỹ sư phần mềm Java');
    console.log('✅ Model is working!');
    console.log('   Embedding dimension:', result.data.length);
    console.log('   First 5 values:', Array.from(result.data).slice(0, 5));
    
    console.log('');
    console.log('✨ All done!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set EMBEDDING_PROVIDER=local in .env');
    console.log('  2. Run: npm start');
    console.log('');
    console.log('📝 For Docker, the model is cached and will not re-download.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"
