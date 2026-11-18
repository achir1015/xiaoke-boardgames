import Foundation
import WebKit

/// Mac 版用自訂網址 xks://localhost/ 直接讀 App 裡的 web 資料夾（總選單＋象棋、跳棋、圍棋）。
/// 不開任何網路伺服器，所以沙盒不需要 com.apple.security.network.server（App Store 審查 2.4.5 要求只留必要權限）。
/// 主機名用 localhost：WebKit 視為「安全來源」，ES 模組、IndexedDB、Worker、麥克風（語音通話）都能用。
/// 音樂支援 Range（播放音訊會用 Range 要資料，也才能拖曳進度）。
final class AppScheme: NSObject, WKURLSchemeHandler {
    static let scheme = "xks"
    static let start = URL(string: "xks://localhost/index.html")!
    private let root = Bundle.main.url(forResource: "web", withExtension: nil)!
    private let queue = DispatchQueue(label: "xks.scheme", attributes: .concurrent)
    private var stopped = Set<ObjectIdentifier>()
    private let lock = NSLock()

    func webView(_ w: WKWebView, start task: WKURLSchemeTask) {
        let req = task.request
        queue.async { [weak self] in self?.serve(task, req) }
    }

    func webView(_ w: WKWebView, stop task: WKURLSchemeTask) {
        lock.lock(); stopped.insert(ObjectIdentifier(task)); lock.unlock()
    }

    private func serve(_ task: WKURLSchemeTask, _ req: URLRequest) {
        guard let url = req.url else { return }
        var path = url.path.removingPercentEncoding ?? url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard !path.contains(".."), file.path.hasPrefix(root.standardizedFileURL.path),
              let body = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            finish(task, url, status: 404, headers: ["Content-Length": "0"], body: Data())
            return
        }
        var headers = [
            "Content-Type": LocalMime.type((path as NSString).pathExtension.lowercased()),
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
        ]
        let total = body.count
        if let range = req.value(forHTTPHeaderField: "Range"), range.hasPrefix("bytes="), total > 0 {
            let spec = range.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
            let se = spec.split(separator: "-", omittingEmptySubsequences: false).map { String($0).trimmingCharacters(in: .whitespaces) }
            var s = 0, e = total - 1
            if se.count == 2 {
                if se[0].isEmpty, let n = Int(se[1]) { s = max(0, total - n) }
                else { s = Int(se[0]) ?? 0; if let x = Int(se[1]) { e = min(x, total - 1) } }
            }
            if s > e || s >= total {
                headers["Content-Range"] = "bytes */\(total)"
                headers["Content-Length"] = "0"
                finish(task, url, status: 416, headers: headers, body: Data())
                return
            }
            headers["Content-Range"] = "bytes \(s)-\(e)/\(total)"
            headers["Content-Length"] = String(e - s + 1)
            finish(task, url, status: 206, headers: headers, body: body.subdata(in: s..<(e + 1)))
            return
        }
        headers["Content-Length"] = String(total)
        finish(task, url, status: 200, headers: headers, body: body)
    }

    private func finish(_ task: WKURLSchemeTask, _ url: URL, status: Int, headers: [String: String], body: Data) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.lock.lock(); let gone = self.stopped.remove(ObjectIdentifier(task)) != nil; self.lock.unlock()
            if gone { return }
            let resp = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
            task.didReceive(resp)
            if !body.isEmpty { task.didReceive(body) }
            task.didFinish()
        }
    }
}

enum LocalMime {
    static func type(_ ext: String) -> String {
        switch ext {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "mp3": return "audio/mpeg"
        case "ogg": return "audio/ogg"
        case "wav": return "audio/wav"
        case "wasm": return "application/wasm"
        case "onnx", "bin": return "application/octet-stream"
        case "txt": return "text/plain; charset=utf-8"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
}
