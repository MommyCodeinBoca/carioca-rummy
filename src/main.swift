// Carioca Rummy — native macOS shell.
//
// AppKit window hosting a WKWebView that loads the bundled game. Built with
// swiftc directly (no Xcode project) because only the Command Line Tools are
// installed on this machine.
//
// The game is served over a custom URL scheme rather than file:// so that it
// gets a real, stable security origin — WKWebView denies localStorage to
// file:// pages, and the game's save/resume depends on it.

import Cocoa
import WebKit
import UniformTypeIdentifiers

let feltColor = NSColor(srgbRed: 0.059, green: 0.180, blue: 0.106, alpha: 1) // #0f2e1b

// MARK: - Serve the bundled game from carioca://app/

final class GameSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL

    init(root: URL) { self.root = root }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL)); return
        }

        // carioca://app/index.html -> <Resources>/index.html
        var name = url.path
        if name.isEmpty || name == "/" { name = "/index.html" }
        let fileURL = root.appendingPathComponent(String(name.dropFirst()))

        // Never serve anything outside Resources, however the path is written.
        guard fileURL.standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }

        let mime: String
        switch fileURL.pathExtension.lowercased() {
        case "html": mime = "text/html"
        case "css":  mime = "text/css"
        case "js":   mime = "text/javascript"
        case "woff2": mime = "font/woff2"
        case "png":  mime = "image/png"
        default:     mime = "application/octet-stream"
        }

        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": mime, "Content-Length": String(data.count)]
        )!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ note: Notification) {
        let resources = Bundle.main.resourceURL!

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // localStorage persists across launches
        config.setURLSchemeHandler(GameSchemeHandler(root: resources), forURLScheme: "carioca")
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        // Match the felt so resizing and first paint never flash white.
        if #available(macOS 12.0, *) { webView.underPageBackgroundColor = feltColor }
        webView.allowsBackForwardNavigationGestures = false

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false
        )
        window.title = "Carioca Rummy"
        window.minSize = NSSize(width: 900, height: 620)
        window.backgroundColor = feltColor
        window.contentView = webView
        window.setFrameAutosaveName("CanastaMainWindow")   // remembers size and position
        window.center()
        window.makeKeyAndOrderFront(nil)

        buildMenu()
        webView.load(URLRequest(url: URL(string: "carioca://app/index.html")!))
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    // Set CANASTA_SELFTEST=<path> to boot the game, probe it, write a report and
    // quit. Lets the app be verified without a screen — including whether
    // localStorage really works over the custom scheme, which file:// denies.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let out = ProcessInfo.processInfo.environment["CANASTA_SELFTEST"] else { return }
        let phase = ProcessInfo.processInfo.environment["CANASTA_SELFTEST_PHASE"] ?? "full"

        // Phase 2 of the persistence check: a separate launch, so this proves the
        // save survived process death rather than just living in memory.
        if phase == "check" {
            let checkJS = """
            (function () {
              var s = readSavedGame();
              var lines = [];
              lines.push((s ? 'PASS' : 'FAIL') + ' - saved game survived an app restart' +
                         (s ? '  [round ' + s.round + ', ' + (s.hands ? s.hands[0].length : '?') + ' cards in hand]' : ''));
              try { resumeSavedGame(s); lines.push((G && G.hands && G.hands[0].length > 0 ? 'PASS' : 'FAIL') + ' - resume restores the table'); }
              catch (e) { lines.push('FAIL - resume restores the table  [' + e.message + ']'); }
              clearSavedGame();
              return lines.join('\\n');
            })();
            """
            webView.evaluateJavaScript(checkJS) { result, error in
                let text = (result as? String) ?? "SELFTEST ERROR: \(error?.localizedDescription ?? "no result")"
                try? text.write(toFile: out, atomically: true, encoding: .utf8)
                NSApp.terminate(nil)
            }
            return
        }

        let js = """
        (function () {
          var r = [];
          function ok(n, c, x) { r.push((c ? 'PASS' : 'FAIL') + ' - ' + n + (x ? '  [' + x + ']' : '')); }
          ok('page origin is carioca://', location.protocol === 'carioca:', location.href);
          ok('game script loaded', typeof startRound === 'function' && typeof shuffle === 'function');
          ok('setup screen present', !!document.getElementById('start-btn'));
          try {
            localStorage.setItem('__probe', 'x');
            ok('localStorage works', localStorage.getItem('__probe') === 'x');
            localStorage.removeItem('__probe');
          } catch (e) { ok('localStorage works', false, e.message); }
          ok('save/restore wired', ['saveGame','loadGame','clearSave','replayDeal','offerResume']
              .every(function (f) { return typeof window[f] === 'function'; }));
          try {
            document.getElementById('start-btn').click();
            ok('deal succeeded', G && G.players && G.players.length === 4 &&
                G.players[0].hand.length === 7,
                'hand=' + (G.players[0] ? G.players[0].hand.length : '?'));
            ok('the deal has a number', !!G.seed, 'deal #' + G.seed);
            ok('every card accounted for',
                G.players.reduce(function (t, p) { return t + p.hand.length; }, 0)
                  + G.stock.length + G.discard.length === 108);
            localStorage.removeItem('carioca.save');
            saveGame();
            ok('game persisted to storage', !!localStorage.getItem('carioca.save'));
            // Deliberately left in place — the "check" phase reads it back on a
            // fresh launch to prove persistence survives quitting the app.
          } catch (e) { ok('deal succeeded', false, e.message); }
          ok('cards rendered', document.querySelectorAll('.card').length > 10,
              document.querySelectorAll('.card').length + ' card elements');
          return r.join('\\n');
        })();
        """
        webView.evaluateJavaScript(js) { result, error in
            let text = (result as? String) ?? "SELFTEST ERROR: \(error?.localizedDescription ?? "no result")"
            try? text.write(toFile: out, atomically: true, encoding: .utf8)
            NSApp.terminate(nil)
        }
    }

    // Open any outbound link in the real browser instead of replacing the game.
    func webView(_ webView: WKWebView,
                 decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url, url.scheme != "carioca", action.navigationType == .linkActivated {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    // MARK: Menus — without these there is no Cmd+Q, which makes the app feel broken.

    private func buildMenu() {
        let mainMenu = NSMenu()

        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Carioca Rummy",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Carioca Rummy",
                        action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Carioca Rummy",
                        action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let gameItem = NSMenuItem()
        mainMenu.addItem(gameItem)
        let gameMenu = NSMenu(title: "Game")
        gameMenu.addItem(withTitle: "New Game", action: #selector(newGame), keyEquivalent: "n")
        gameMenu.addItem(withTitle: "Rules", action: #selector(showRules), keyEquivalent: "?")
        gameMenu.addItem(.separator())
        gameMenu.addItem(withTitle: "Reload", action: #selector(reload), keyEquivalent: "r")
        gameMenu.items.forEach { $0.target = self }
        gameItem.submenu = gameMenu

        let viewItem = NSMenuItem()
        mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(withTitle: "Enter Full Screen",
                         action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        viewMenu.items.first?.keyEquivalentModifierMask = [.command, .control]
        viewItem.submenu = viewMenu

        NSApp.mainMenu = mainMenu
    }

    @objc private func reload() {
        webView.load(URLRequest(url: URL(string: "carioca://app/index.html")!))
    }

    @objc private func newGame() {
        // Clear any saved game first so "New Game" really starts fresh.
        webView.evaluateJavaScript(
            "try{localStorage.removeItem('carioca.save');}catch(e){}; location.reload();"
        )
    }

    @objc private func showRules() {
        // openRules() also builds the contents list on first open.
        webView.evaluateJavaScript(
            "typeof openRules === 'function' ? openRules() "
          + ": document.getElementById('info-screen')?.classList.add('active');"
        )
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
