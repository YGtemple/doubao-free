<div align="right">

**[English](README.md)** · [简体中文](README.zh-CN.md)

</div>

# doubao-free

A Chrome extension for interacting with the Doubao web client more freely — gets past common interface limits.

<sub>Chrome MV3 · 11 files</sub>

---

## What it does

The Doubao web page restricts certain interactions. This extension works around them at the browser level.

## The parts

```
src/ (or extension root)
├── manifest.json      MV3 manifest
├── content/           runs in the page context
└── background/        service worker
```

As a Manifest V3 extension it separates page-context content scripts from the background service worker, and keeps the boundary that Chrome enforces.

## Installing

1. Load the unpacked extension: chrome://extensions → Developer mode → Load unpacked → select this folder
2. Enable it
3. Open Doubao in the browser

## Note

Read the intent of the extension before relying on it. The scripts modify page behaviour, so make sure the package matches what you expect it to do. Kept public for reference and study of the MV3 pattern.

## License

MIT