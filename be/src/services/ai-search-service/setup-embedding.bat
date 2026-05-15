@echo off
REM 🚀 AI Search Service - Local Embedding Setup Script (Windows)
REM Tự động tải model embedding về máy local

echo.
echo ================================
echo   AI Search - Embedding Setup
echo ================================
echo.

cd /d "%~dp0"

echo 📦 Installing dependencies...
call npm install

echo.
echo 📥 Downloading embedding model (first time only)...
echo    Model: Xenova/multilingual-e5-small
echo    Size: ~1.5GB
echo    Location: %%USERPROFILE%%\.cache\huggingface\hub\
echo.
echo ⏳ This may take 5-10 minutes...
echo.

REM Download model
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

if errorlevel 1 (
  echo.
  echo ❌ Setup failed. Please check the error message above.
  pause
  exit /b 1
)

echo.
pause
