# 小柯機器人棋類大全

象棋、中國跳棋、圍棋，一個 App 全部玩（App Store 版：iPhone、iPad、Mac）。

- 總選單：小柯機器人歡迎、三種棋的卡片（開始下棋、📖 學下棋、已收錄的棋譜數）、共用設定（暱稱、背景音樂、音效）、關於。
- 三種棋沿用各自專案的手機版網頁：
  - [小柯機器人象棋遊戲](https://github.com/achir1015/xiaoke-chess)
  - [小柯機器人跳棋遊戲](https://github.com/achir1015/xiaoke-checkers)
  - [小柯機器人圍棋競賽](https://github.com/achir1015/xiaoke-go)
- 每種棋都能和 AI 對賽、用房號連線對戰與語音聊天，也有 AI 軍師與語音動畫教學。

## 建置

```bash
node scripts/build-web.mjs --rebuild   # 重新產生三個遊戲的手機版網頁，組合成 web/
node e2e/suite.mjs                      # 模擬 iPhone／iPad／Mac 外殼的測試
node e2e/shots.mjs                      # App Store 截圖
```

Mac 上：`bash ios/build-appstore.sh both` 封存 iPhone／iPad 與 Mac 版，`bash ios/upload-appstore.sh` 上傳（要在 Mac 畫面上的終端機執行）。

- [技術支援](https://achir1015.github.io/xiaoke-boardgames/support.html)
- [隱私權政策](https://achir1015.github.io/xiaoke-boardgames/privacy.html)

系統開發：吳玉柱 先生 與 Claude AI Opus 5.5
