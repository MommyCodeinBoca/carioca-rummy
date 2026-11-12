#!/bin/bash
# Build Carioca Rummy.app from source + the current game HTML.
# Requires only the Xcode Command Line Tools (swiftc), not full Xcode.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/src"
GAME="${1:-$HERE/carioca.html}"
APP="$HERE/Carioca Rummy.app"

if [ ! -f "$GAME" ]; then
  echo "error: game HTML not found at $GAME" >&2
  exit 1
fi

echo "==> Compiling Swift shell"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

swiftc -O \
  -target "$(uname -m)-apple-macos12.0" \
  -framework Cocoa -framework WebKit \
  -o "$APP/Contents/MacOS/CariocaRummy" \
  "$SRC/main.swift"

echo "==> Copying game ($(wc -c < "$GAME" | tr -d ' ') bytes)"
cp "$GAME" "$APP/Contents/Resources/index.html"
cp "$SRC/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

echo "==> Writing Info.plist"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>                  <string>Carioca Rummy</string>
  <key>CFBundleDisplayName</key>           <string>Carioca Rummy</string>
  <key>CFBundleExecutable</key>            <string>CariocaRummy</string>
  <key>CFBundleIdentifier</key>            <string>com.habermann.carioca-rummy</string>
  <key>CFBundleIconFile</key>              <string>AppIcon</string>
  <key>CFBundlePackageType</key>           <string>APPL</string>
  <key>CFBundleShortVersionString</key>    <string>1.1</string>
  <key>CFBundleVersion</key>               <string>1.1</string>
  <key>LSMinimumSystemVersion</key>        <string>12.0</string>
  <key>NSHighResolutionCapable</key>       <true/>
  <key>LSApplicationCategoryType</key>     <string>public.app-category.card-games</string>
  <key>NSSupportsAutomaticTermination</key><false/>
</dict>
</plist>
PLIST

echo "==> Ad-hoc signing"
codesign --force --deep --sign - "$APP" 2>&1 | sed 's/^/    /' || true

echo "==> Built: $APP"
