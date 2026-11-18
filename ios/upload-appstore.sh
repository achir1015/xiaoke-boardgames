#!/bin/bash
# 把 build-appstore.sh 封存好的 iPhone／iPad 版與 Mac 版上傳到 App Store Connect。
# 要在 Mac 的登入畫面裡（終端機 App）執行：
#   osascript ios/run-in-terminal.applescript "bash ~/Developer/xiaoke-boardgames/ios/upload-appstore.sh"
# 進度寫在 ios/build/upload.log，完成會留下 ios/build/upload.done
cd "$(dirname "$0")"
mkdir -p build
rm -f build/upload.done
exec > >(tee build/upload.log) 2>&1
for A in XiaokeBoardGames XiaokeBoardGamesMac; do
  echo "== $A"
  [ -d build/$A-store.xcarchive ] || { echo "沒有 build/$A-store.xcarchive"; continue; }
  rm -rf build/upload-$A
  xcodebuild -exportArchive -archivePath build/$A-store.xcarchive -exportPath build/upload-$A -exportOptionsPlist ExportUpload.plist -allowProvisioningUpdates 2>&1 | grep -vE "^\s*$" | tail -8
done
echo done > build/upload.done
