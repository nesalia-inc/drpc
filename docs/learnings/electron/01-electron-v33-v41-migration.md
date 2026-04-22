# Electron v33 to v41 Migration Guide

> Research date: 2026-04-22
> Electron versions covered: 33, 34, 35, 36, 37, 38, 39, 40, 41

## Summary

Migrating from Electron 33 to 41 spans **8 major versions** (~18 months of releases). The stack upgrades significantly: Node.js from 20.18.0 to 24.14.0 (Node 22+ now standard), Chrome from 130 to 146. Key migration areas include: preload script API changes, clipboard API restrictions, web frame API deprecations, and removal of legacy environment variables.

---

## Version-by-Version Breaking Changes

### Electron 41 (Chrome 146, Node 24.14.0)

**Stack upgrades:**
- Chrome: 130 -> 146
- Node.js: 20.18.0 -> 24.14.0 (Electron now ships Node 22+ as standard)
- V8: 13.0 -> 14.6

**Breaking changes:**
- Fixed cookie changed events not properly emitting in all cases (behavior change, may affect code relying on old behavior)
- PDFs no longer create separate WebContents; use frame tree instead

**Security fixes:**
- Added additional defense against privileged user modifications to ASAR Integrity protected applications on macOS
- Fixed cookie encryption key provider not being passed into network service on Windows/Linux

**Additions:**
- New `--disable-geolocation` command-line flag for macOS
- `webContents.getOrCreateDevToolsTargetId()` method added
- NV12 support for importing shared textures
- WebSocket authentication support via `webContents` `login` event
- Wayland frameless windows now have GTK drop shadows

**Migration:** No API removals, primarily behavioral fixes. Ensure cookie change event handlers handle all emission cases.

---

### Electron 40 (Chrome 144, Node 24.11.1)

**Stack upgrades:**
- Chrome: 142 -> 144
- Node.js: 22.20.0 -> 24.11.1

**Breaking changes:**
- **Deprecated clipboard API access from renderer processes** (#48923). The clipboard API can no longer be used directly in renderer processes.

**Deprecations:**
- `clipboard` API in renderer processes (use contextBridge to expose from preload)

**Other changes:**
- macOS dSYM files now use `tar.xz` instead of `zip` (#48952)
- `showHiddenFiles` in Dialogs deprecated on Linux (honored on macOS/Windows only)

**Migration steps:**
```javascript
// BEFORE (Electron < 40, deprecated in renderer)
const { clipboard } = require('electron');
clipboard.writeText('hello');

// AFTER (Electron 40+)
 // In preload script (preload.js):
const { contextBridge, clipboard } = require('electron');
contextBridge.exposeInMainWorld('clipboard', {
  writeText: (text) => clipboard.writeText(text),
  readText: () => clipboard.readText()
});

// In renderer process:
window.clipboard.writeText('hello');
```

---

### Electron 39 (Chrome 142, Node 22.20.0)

**Stack upgrades:**
- Chrome: 140 -> 142
- Node.js: 22.18.0 -> 22.20.0

**Breaking changes:**
- Offscreen Rendering API Modified: Added `colorSpace` to offscreen shared texture info of `webContents.on('paint')` event. Changed `OffscreenSharedTexture` signature to provide a unified `handle` holding the native handle (#47315)
- `window.open` popups are now always resizable per WHATWG spec (#47540)

**Deprecations:**
- `--host-rules` flag deprecated; use `--host-resolver-rules` instead

**Other changes:**
- `NSAudioCaptureUsageDescription` required in Info.plist for `desktopCapturer` on macOS 14.2+

**Migration steps:**
```javascript
// BEFORE (Electron < 39) - OffscreenSharedTexture
webContents.on('paint', (event, image, dirty) => {
  // image had separate width/height/handle properties
});

// AFTER (Electron 39+) - OffscreenSharedTexture has unified handle
webContents.on('paint', (event, image, dirty, sharedTexture) => {
  // Use sharedTexture.handle for native handle
  // sharedTexture.colorSpace now included
});

// For --host-rules migration in app startup:
app.commandLine.appendSwitch('host-resolver-rules', 'MAP * 127.0.0.1');
// Instead of: app.commandLine.appendSwitch('host-rules', 'MAP * 127.0.0.1');
```

---

### Electron 38 (Chrome 140, Node 22.18.0)

**Stack upgrades:**
- Chrome: 138 -> 140
- Node.js: 22.16.0 -> 22.18.0

**Breaking changes:**
- Removed `ELECTRON_OZONE_PLATFORM_HINT` and `ORIGINAL_XDG_CURRENT_DESKTOP` environment variables
- macOS 11 (Big Sur) no longer supported
- `plugin-crashed` event on WebContents removed

**Deprecations:**
- `webFrame.routingId` deprecated; use `webFrame.frameToken` instead
- `webFrame.findFrameByRoutingId()` deprecated; use `webFrame.findFrameByToken()` instead

**Migration steps:**
```javascript
// BEFORE (Electron < 38)
const routingId = webFrame.routingId;
const frame = webFrame.findFrameByRoutingId(routingId);

// AFTER (Electron 38+)
const frameToken = webFrame.frameToken;
const frame = webFrame.findFrameByToken(frameToken);
```

---

### Electron 37 (Chrome 138, Node 22.16.0)

**Stack upgrades:**
- Chrome: 136 -> 138
- Node.js: 22.14.0 -> 22.16.0

**Breaking changes:**
- Utility Process unhandled rejection now shows error instead of crashing
- `process.exit()` kills utility process synchronously (previously async)
- `ProtocolResponse.session` set to `null` feature removed (creating random session via null session no longer works)

**Deprecations:**
- `NativeImage.getBitmap()` deprecated

**Migration steps:**
```javascript
// For NativeImage.getBitmap():
// BEFORE (Electron < 37)
const bitmap = nativeImage.getBitmap();

// AFTER (Electron 37+)
const bitmap = nativeImage.toBitmap();

// For ProtocolResponse.session = null removal:
// If using custom protocol with null session, you must now
// explicitly create or reference a named session
session.fromPartition('persist:my-session');
```

---

### Electron 36 (Chrome 136, Node 22.14.0)

**Stack upgrades:**
- Chrome: 134 -> 136
- Node.js: 22.10.0 -> 22.14.0

**Breaking changes:**
- `app.commandLine` converts switches and arguments to lowercase
- GTK 4 now default on GNOME (Linux breaking change)

**Deprecations:**
- `NativeImage.getBitmap()` deprecated (use `toBitmap()` instead)
- `getPreloads` and `setPreloads` on `Session` deprecated; use `registerPreloadScript`, `unregisterPreloadScript`, `getPreloadScripts` instead (#45230)

**Removals:**
- `PrinterInfo.isDefault` and `status` properties removed (#45500)
- `ses.clearDataStorage({ quota: 'syncable' })` functionality removed (#45923)
- `systemPreferences.isAeroGlassEnabled()` API removed

**Extension APIs moved:**
- Session extension APIs moved to `Session.extensions` namespace

**Migration steps:**
```javascript
// Session preload scripts migration:
 // BEFORE (Electron < 36)
session.setPreloads([path.join(__dirname, 'preload.js')]);
const preloads = session.getPreloads();

 // AFTER (Electron 36+)
session.registerPreloadScript(path.join(__dirname, 'preload.js'));
const scripts = session.getPreloadScripts();

// Extension APIs:
 // BEFORE
session.setCertificateVerifyProc(callback);
 // AFTER
session.extensions.setCertificateVerifyProc(callback);
```

---

### Electron 35 (Chrome 134, Node 22.14.0)

**Stack upgrades:**
- Chrome: 132 -> 134
- Node.js: 22.8.0 -> 22.14.0

**Breaking changes:**
- Added `excludeUrls` to `webRequest` filter
- `urls` property in webRequest no longer accepts empty arrays to mean "match all"; use `'<all_urls>'` explicitly
- `console-message` event arguments moved into event object

**Deprecations:**
- `session.setPreloads`/`getPreloads` deprecated (use registerPreloadScript API)
- `systemPreferences.isAeroGlassEnabled()` deprecated

**Removals:**
- 240 FPS limit when using shared texture OSR removed

**Migration steps:**
```javascript
// webRequest urls filter:
 // BEFORE (Electron < 35)
webRequest.onBeforeRequest({ urls: [] }, callback);
 // AFTER (Electron 35+)
webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, callback);

// console-message event:
 // BEFORE (Electron < 35)
session.on('console-message', (event, level, message, lineNumber, sourceId) => {
  console.log(`[${level}] ${message} at ${lineNumber}`);
});

 // AFTER (Electron 35+)
session.on('console-message', (event) => {
  // event object contains: level, message, lineNumber, sourceId, frame
  console.log(`[${event.level}] ${event.message} at ${event.lineNumber}`);
});
```

---

### Electron 34 (Chrome 132, Node 20.18.1)

**Stack upgrades:**
- Chrome: 130 -> 132
- Node.js: 20.18.0 -> 20.18.1

**Breaking changes:**
- Menu bar now hidden on fullscreen in Windows (matching Linux behavior)

**Features added:**
- Shared dictionary management APIs (`session.getSharedDictionaryUsageInfo()`, `session.getSharedDictionaryInfo()`, `session.clearSharedDictionaryCache()`, `session.clearSharedDictionaryCacheForIsolationKey()`)
- `WebFrameMain.collectJavaScriptCallStack()` for accessing JavaScript call stacks of unresponsive renderers
- `WebFrameMain.detached` and `WebFrameMain.isDestroyed` properties

**Migration:** If you previously relied on menu bar being visible during fullscreen on Windows, update your approach to account for automatic hiding.

---

### Electron 33 (Chrome 130, Node 20.18.0)

**Breaking changes:**
- Deprecated usage of `textured` BrowserWindow `type` option on macOS
- Custom protocol URLs using Windows file paths no longer work with deprecated `protocol.registerFileProtocol` and `baseURLForDataURL`
- `document.execCommand("paste")` deprecated; use async clipboard API
- `WebFrameMain` instances may return detached or null after cross-origin navigation
- macOS 10.15 (Catalina) no longer supported
- Native modules now require C++20

**Deprecations:**
- `textured` BrowserWindow type on macOS

**Features added:**
- `app.setClientCertRequestPasswordHandler()` for cryptographic device PINs
- `View.setBorderRadius(radius)` for customizing view border radius
- `DownloadItem.getCurrentBytesPerSecond()`, `getPercentComplete()`, `getEndTime()`
- `nativeTheme.prefersReducedTransparency` property

---

## Key Migration Summary

### High Impact Changes

| Change | Versions Affected | Effort |
|--------|------------------|--------|
| Clipboard API renderer deprecation | 40+ | Medium - requires preload/contextBridge refactor |
| webFrame.routingId -> frameToken | 38+ | Low - simple API rename |
| Session preload API -> registerPreloadScript | 36+ | Medium - API migration |
| OffscreenRendering handle signature | 39+ | Medium - event data structure change |
| console-message event args | 35+ | Low - object destructuring change |

### Stack Summary

| Version | Chrome | Node.js | Key Theme |
|---------|--------|---------|-----------|
| 33 | 130 | 20.18.0 | macOS 10.15 drop, C++20 |
| 34 | 132 | 20.18.1 | Menu bar fullscreen fix |
| 35 | 134 | 22.14.0 | Preload API, console-message |
| 36 | 136 | 22.14.0 | GTK4, print APIs |
| 37 | 138 | 22.16.0 | Utility process fixes |
| 38 | 140 | 22.18.0 | macOS 11 drop, routingId |
| 39 | 142 | 22.20.0 | Offscreen API, window.open |
| 40 | 144 | 24.11.1 | Clipboard deprecation |
| 41 | 146 | 24.14.0 | Security fixes, Node 24 |

---

## Recommended Migration Order

For applications on Electron 33 or earlier:

1. **First upgrade to Electron 38** - major deprecations but stable API surface
2. **Fix webFrame.routingId usage** - rename to frameToken/findFrameByToken
3. **Update Session preload scripts** - migrate to registerPreloadScript API
4. **Fix console-message event handlers** - migrate to event object pattern
5. **Upgrade to Electron 40** - implement clipboard via contextBridge
6. **Upgrade to Electron 41** - verify cookie change event handling

---

## Testing Recommendations

1. **Cookie change events** - Verify all cookie change handlers receive events after Electron 41
2. **Clipboard operations** - Ensure all clipboard use goes through preload contextBridge
3. **WebFrameMain** - Check for detached/null instances after cross-origin navigation
4. **Menu bar** - Verify fullscreen behavior on Windows matches expected hide/show
5. **Utility processes** - Test process.exit() behavior and unhandled rejection handling

---

## Resources

- [Electron Releases](https://releases.electronjs.org/)
- [Electron Documentation](https://electronjs.org/docs/latest/)
- [Breaking Changes History](https://electronjs.org/docs/latest/breaking-changes)