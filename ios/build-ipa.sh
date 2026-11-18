#!/bin/bash
# 封存並匯出 Ad Hoc 的 .ipa（實機測試用，限開發者帳號登記過的 iPad／iPhone）。
# 要在 Mac 的登入畫面裡（終端機 App）執行：
#   osascript ios/run-in-terminal.applescript "bash ~/Developer/xiaoke-boardgames/ios/build-ipa.sh"
# 產出：ios/build/xiaoke-boardgames-ios.ipa；進度寫在 ios/build/ipa.log，完成會留下 ios/build/ipa.done（內容 ok 或 fail）
cd "$(dirname "$0")"
export PATH=/usr/local/bin:/opt/homebrew/bin:$PATH
mkdir -p build
rm -f build/ipa.done
exec > >(tee build/ipa.log) 2>&1
set -o pipefail
fail() { echo "fail" > build/ipa.done; exit 1; }
bash sync.sh || fail
rm -rf build/XiaokeBoardGames.xcarchive build/export
xcodebuild -project XiaokeBoardGames.xcodeproj -scheme XiaokeBoardGames -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/XiaokeBoardGames.xcarchive \
  -allowProvisioningUpdates archive | grep -E 'error|warning: .*sign|ARCHIVE' || fail
xcodebuild -exportArchive -archivePath build/XiaokeBoardGames.xcarchive -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates || fail
IPA=$(ls build/export/*.ipa | head -1)
[ -f "$IPA" ] || fail
cp "$IPA" build/xiaoke-boardgames-ios.ipa
ls -l build/xiaoke-boardgames-ios.ipa
echo "ok" > build/ipa.done
