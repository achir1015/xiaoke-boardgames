import Foundation

/// App 只會用瀏覽器打開這些外部網址（App Store 2.5.2／2.3.10：不連到安裝其他 App 或其他平台下載的頁面）：
/// 棋類大全的支援、隱私、檢舉回報頁，Anthropic 主控台（申請 Claude 金鑰），App Store。
enum ExternalLinks {
    static func allowed(_ u: URL) -> Bool {
        guard u.scheme == "https", let host = u.host?.lowercased() else { return false }
        switch host {
        case "achir1015.github.io": return u.path.hasPrefix("/xiaoke-boardgames/")
        case "github.com": return u.path.hasPrefix("/achir1015/xiaoke-boardgames")
        case "console.anthropic.com", "apps.apple.com": return true
        default: return false
        }
    }
}
