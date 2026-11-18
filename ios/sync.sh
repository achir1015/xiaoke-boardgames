#!/bin/bash
# 把網頁（先在專案根目錄執行 node scripts/build-web.mjs 產生 web/）複製到 ios/web，
# 版本號跟著 package.json，再產生 Xcode 專案。在 Mac 上執行：bash ios/sync.sh
set -e
cd "$(dirname "$0")"
[ -f ../web/index.html ] || { echo "找不到 ../web，請先執行 node scripts/build-web.mjs"; exit 1; }
rm -rf web && cp -R ../web web
V=$(python3 -c 'import json;print(json.load(open("../package.json"))["version"])')
# 版本號：1.0.0 → build 10000（每次送審都要比上一次大）
B=$(python3 -c "a,b,c=(int(x) for x in '$V'.split('.'));print(a*10000+b*100+c)")
# 只改最上面共用的設定（4 格縮排）；Mac 目標若另外寫了 CURRENT_PROJECT_VERSION（同版本重新上傳用），不會被蓋掉，下一版記得刪掉
sed -i '' "s/^    MARKETING_VERSION: \".*\"/    MARKETING_VERSION: \"$V\"/; s/^    CURRENT_PROJECT_VERSION: \".*\"/    CURRENT_PROJECT_VERSION: \"$B\"/" project.yml
XG=$(command -v xcodegen || echo /usr/local/bin/xcodegen)
"$XG" generate --quiet
echo "web ok, version $V ($B)"
