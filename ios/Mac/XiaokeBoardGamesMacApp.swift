import AppKit
import SwiftUI
import UniformTypeIdentifiers
import WebKit

/// 小柯機器人棋類大全 — Mac 版（Mac App Store）
/// 和 iPhone／iPad 版同一份網頁（總選單＋象棋、跳棋、圍棋，LocalServer 在 127.0.0.1 提供），畫面是電腦版版面（各遊戲 js/xk-mobile.js 的 mac 模式）。
/// 視窗關掉就結束程式：AI、音樂、語音通話全部停止。
@main
struct XiaokeBoardGamesMacApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    init() { LocalServer.shared.start() }

    var body: some Scene {
        WindowGroup {
            WebContainer()
                .frame(minWidth: 1180, minHeight: 740)
                .background(Color(red: 0.106, green: 0.078, blue: 0.063))
        }
        .defaultSize(width: 1440, height: 900)
        .commands { CommandGroup(replacing: .newItem) {} }   // 只有一個視窗
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

struct WebContainer: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView { Web.shared.view }
    func updateNSView(_ v: WKWebView, context: Context) {}
}

/// 網頁與 App 之間的橋（和 iPhone／iPad 版同樣的名字與指令：總選單 xks、象棋 xkc、跳棋 xkj、圍棋 xkg）
final class Web: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate, WKUIDelegate {
    static let shared = Web()
    static let bridges: [String: (name: String, file: String)] = [
        "xks": ("小柯棋類大全", "棋譜.txt"),
        "xkc": ("小柯象棋", "象棋棋譜.txt"),
        "xkj": ("小柯跳棋", "跳棋棋譜.txt"),
        "xkg": ("小柯圍棋", "圍棋棋譜.sgf"),
    ]
    let view: WKWebView
    private var saves: [String: (url: URL, handle: FileHandle, name: String)] = [:]

    override init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.mediaTypesRequiringUserActionForPlayback = []
        // mac：電腦版版面；store：App Store 版（不檢查更新、由 App Store 更新）；suite：在棋類大全裡
        let shim = WKUserScript(source: """
            window.XiaokeIOS = { store: true, mac: true, suite: true };
            (function () {
              function send(k, a) { try { window.webkit.messageHandlers.xks.postMessage({ cmd: 'log', args: [k + ' ' + location.pathname, Array.prototype.map.call(a, function (x) { return x && x.stack ? x.stack : String(x); }).join(' ')] }); } catch (e) {} }
              var ce = console.error.bind(console);
              console.error = function () { send('error', arguments); ce.apply(null, arguments); };
              window.addEventListener('error', function (e) { send('pageerror', [e.message + ' @' + e.filename + ':' + e.lineno]); });
              window.addEventListener('unhandledrejection', function (e) { send('rejection', [e.reason]); });
            })();
            """, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        cfg.userContentController.addUserScript(shim)
        // 自動測試（open --env XK_SELFTEST=1）：總選單 → 象棋 → 跳棋 → 圍棋 → 回總選單，每一頁記錄結果到容器 tmp/web.log [web selftest]
        if ProcessInfo.processInfo.environment["XK_SELFTEST"] == "1" {
            cfg.userContentController.addUserScript(WKUserScript(source: """
                setTimeout(async function () {
                  var w = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
                  var log = function (r) { window.webkit.messageHandlers.xks.postMessage({ cmd: 'log', args: ['selftest', JSON.stringify(r)] }); };
                  var order = ['chess', 'checkers', 'go'];
                  var step = Number(sessionStorage.getItem('xk.selftest') || '0');
                  var r = { page: location.pathname, step: step };
                  try {
                    if (step === 0 || step > order.length) {
                      r.cards = document.querySelectorAll('.card').length;
                      r.cls = document.documentElement.className;
                      r.win = innerWidth + 'x' + innerHeight;
                      log(r);
                      if (step === 0) { sessionStorage.setItem('xk.selftest', '1'); document.querySelector('[data-play="chess"]').click(); }
                      return;
                    }
                    for (var i = 0; i < 60 && !(window.__xkc || window.__xkg); i++) await w(500);
                    var S = window.__xkc || window.__xkg;
                    r.ready = !!S;
                    r.cls = document.documentElement.className;
                    r.webgl2 = !!document.createElement('canvas').getContext('webgl2');
                    r.store = xk.store;
                    r.name = (await xk.settings.get()).playerName;
                    r.tracks = (await xk.music.list()).length;
                    await w(1500);
                    r.back = !!document.querySelector('#xksHome');
                    r.backVisible = document.documentElement.classList.contains('xks-home');
                    r.modal = !!document.querySelector('.modal');
                  } catch (e) { r.err = String(e && e.stack || e); }
                  log(r);
                  sessionStorage.setItem('xk.selftest', String(step + 1));
                  location.href = step < order.length ? '../' + order[step] + '/index.html' : '../index.html';
                }, 1500);
                """, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        view = WKWebView(frame: .zero, configuration: cfg)
        super.init()
        for name in Self.bridges.keys {
            cfg.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: name)
        }
        view.navigationDelegate = self
        view.uiDelegate = self
        view.setValue(false, forKey: "drawsBackground")
        if #available(macOS 13.3, *) { view.isInspectable = true }
        view.load(URLRequest(url: LocalServer.shared.url))
    }

    // 外部連結（技術支援頁、Claude 主控台）用預設瀏覽器開
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = a.request.url, u.host != "127.0.0.1", u.scheme?.hasPrefix("http") == true, a.targetFrame?.isMainFrame != false {
            NSWorkspace.shared.open(u); decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures f: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url { NSWorkspace.shared.open(u) }
        return nil
    }

    // 匯入棋譜、加入自己的音樂：網頁的 <input type=file> 在 Mac 要由 App 開選擇視窗
    func webView(_ w: WKWebView, runOpenPanelWith p: WKOpenPanelParameters, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = p.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.begin { r in completionHandler(r == .OK ? panel.urls : nil) }
    }

    // 語音通話要用麥克風：系統會先問一次 App 的權限，網頁這邊直接允許
    func webView(_ w: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origin.host == "127.0.0.1" && type == .microphone ? .grant : .deny)
    }

    func webViewWebContentProcessDidTerminate(_ w: WKWebView) { Self.log("網頁程序結束，重新載入"); w.reload() }
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) { Self.log("網頁載入完成 \(w.url?.absoluteString ?? "")") }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { Self.log("網頁載入失敗：\(e)") }

    /// 記錄：系統記錄＋App 容器 tmp/web.log（沙盒裡，遠端除錯用）
    static func log(_ s: String) {
        NSLog("%@", s)
        let u = FileManager.default.temporaryDirectory.appendingPathComponent("web.log")
        let line = Data("\(Date()) \(s)\n".utf8)
        if let h = try? FileHandle(forWritingTo: u) { h.seekToEndOfFile(); h.write(line); try? h.close() } else { try? line.write(to: u) }
    }

    // MARK: 網頁呼叫的功能
    func userContentController(_ u: WKUserContentController, didReceive m: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = m.body as? [String: Any], let cmd = body["cmd"] as? String else { replyHandler(nil, "bad message"); return }
        let args = body["args"] as? [Any] ?? []
        let s = { (i: Int) -> String in args.count > i ? "\(args[i])" : "" }
        let ver = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
        let bridge = Self.bridges[m.name] ?? Self.bridges["xks"]!
        switch cmd {
        case "app_info":
            replyHandler(["status": "ok", "name": bridge.name, "version": ver, "platform": "mac", "model": "Mac"], nil)
        case "begin_save":
            // 匯出棋譜：先寫到暫存檔，結束時讓使用者選擇存放位置
            let name = s(0).replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: ":", with: "_")
            let dir = FileManager.default.temporaryDirectory.appendingPathComponent("export", isDirectory: true)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let url = dir.appendingPathComponent(name.isEmpty ? bridge.file : name)
            try? FileManager.default.removeItem(at: url)
            FileManager.default.createFile(atPath: url.path, contents: nil)
            guard let h = try? FileHandle(forWritingTo: url) else { replyHandler(["status": "error", "message": "無法建立檔案"], nil); return }
            let token = UUID().uuidString
            saves[token] = (url, h, url.lastPathComponent)
            replyHandler(["status": "ok", "token": token, "path": url.lastPathComponent], nil)
        case "write_chunk":
            guard let sv = saves[s(0)], let d = Data(base64Encoded: s(1)) else { replyHandler(["status": "error", "message": "no session"], nil); return }
            sv.handle.write(d)
            replyHandler(["status": "ok"], nil)
        case "end_save":
            guard let sv = saves.removeValue(forKey: s(0)) else { replyHandler(["status": "error", "message": "no session"], nil); return }
            try? sv.handle.close()
            let panel = NSSavePanel()
            panel.nameFieldStringValue = sv.name
            panel.allowedContentTypes = [.plainText, .json]
            panel.allowsOtherFileTypes = true
            panel.begin { r in
                guard r == .OK, let dest = panel.url else { replyHandler(["status": "declined"], nil); return }
                try? FileManager.default.removeItem(at: dest)
                do {
                    try FileManager.default.copyItem(at: sv.url, to: dest)
                    replyHandler(["status": "ok", "path": dest.path], nil)
                } catch { replyHandler(["status": "error", "message": error.localizedDescription], nil) }
            }
        case "log":
            Self.log("[web \(s(0))] \(s(1))")
            replyHandler(true, nil)
        case "open_url":
            if let u = URL(string: s(0)), ["github.com", "achir1015.github.io", "console.anthropic.com", "apps.apple.com"].contains(u.host ?? "") { NSWorkspace.shared.open(u) }
            replyHandler(true, nil)
        default:
            replyHandler(nil, "unknown command \(cmd)")
        }
    }
}
