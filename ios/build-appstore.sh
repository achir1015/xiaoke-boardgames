#!/bin/bash
# App Store 版封存（上傳用 upload-appstore.sh）。
# 要在 Mac 的登入畫面裡（終端機 App）執行，SSH 進來的話鑰匙圈是鎖的、會簽章失敗：
#   osascript ios/run-in-terminal.applescript "bash ~/Developer/xiaoke-boardgames/ios/build-appstore.sh"         iPhone／iPad 版
#   osascript ios/run-in-terminal.applescript "bash ~/Developer/xiaoke-boardgames/ios/build-appstore.sh mac"     Mac 版
#   osascript ios/run-in-terminal.applescript "bash ~/Developer/xiaoke-boardgames/ios/build-appstore.sh macdev"  Mac 版測試用（Debug，沙盒簽章）
#   osascript ios/run-in-terminal.applescript "bash ~/Developer/xiaoke-boardgames/ios/build-appstore.sh both"    iPhone／iPad＋Mac 都封存
# 進度寫在 ios/build/store.log，完成會留下 ios/build/store.done（內容 ok 或 fail）
cd "$(dirname "$0")"
export PATH=/usr/local/bin:/opt/homebrew/bin:$PATH
mkdir -p build
rm -f build/store.done
exec > >(tee build/store.log) 2>&1
set -o pipefail
fail() { echo "fail" > build/store.done; exit 1; }
bash sync.sh || fail
ios() {
  A=build/XiaokeBoardGames-store.xcarchive
  rm -rf "$A"
  xcodebuild -project XiaokeBoardGames.xcodeproj -scheme XiaokeBoardGames -configuration Release -destination 'generic/platform=iOS' \
    -archivePath "$A" -allowProvisioningUpdates archive | grep -E 'error|warning: .*sign|ARCHIVE' || fail
  ls "$A"/Products/Applications/XiaokeBoardGames.app/PrivacyInfo.xcprivacy || fail
}
mac() {
  A=build/XiaokeBoardGamesMac-store.xcarchive
  rm -rf "$A"
  xcodebuild -project XiaokeBoardGames.xcodeproj -scheme XiaokeBoardGamesMac -configuration Release -destination 'generic/platform=macOS' \
    -archivePath "$A" -allowProvisioningUpdates archive | grep -E 'error:|warning: .*sign|ARCHIVE' || fail
  lipo -archs "$A"/Products/Applications/*.app/Contents/MacOS/* || fail
  ls "$A"/Products/Applications/*.app/Contents/Resources/PrivacyInfo.xcprivacy || fail
}
case "$1" in
  macdev)
    xcodebuild -project XiaokeBoardGames.xcodeproj -scheme XiaokeBoardGamesMac -configuration Debug -destination 'platform=macOS' \
      -derivedDataPath ~/Library/Developer/Xcode/DerivedData/xkboard-mac -allowProvisioningUpdates build | grep -E 'error:|warning: .*sign|BUILD' || fail
    codesign -d --entitlements - ~/Library/Developer/Xcode/DerivedData/xkboard-mac/Build/Products/Debug/小柯機器人棋類大全.app 2>&1 | grep -c sandbox || fail
    ;;
  mac) mac ;;
  both) ios; mac ;;
  *) ios ;;
esac
echo "ok" > build/store.done
