# Demo video for the README

The README shows a **“Watch demo”** badge that links to your hosted video. There is no npm or GitHub feature that hosts the video for you—you upload it somewhere public (or unlisted), then paste the URL into the README.

## 1. Record the example app

1. From the repo root: `yarn` then `yarn example start`, and `yarn example ios` or `yarn example android`.
2. Record the screen:
   - **iOS Simulator**: **File → Record Screen**, or use **Cmd + S** workflow in newer Xcode tools; or QuickTime / macOS screenshot bar.
   - **Android Emulator**: the emulator’s **⋯** menu → **Record**.
   - **Physical device**: built-in screen recording, then AirDrop / upload the file.

Keep the clip short (30–90 seconds): show **Zoomable** and **Gallery** from the example app.

## 2. Upload

Pick one:

| Platform | Notes |
|----------|--------|
| [YouTube](https://www.youtube.com/upload) | Unlisted is fine; copy the watch URL. |
| [Loom](https://www.loom.com/) | Good for quick demos; share link. |
| Any host | As long as the URL opens the video in a browser. |

## 3. Put the link in the README

1. Open the root **`README.md`**.
2. Find the demo section (search for `YOUR_DEMO_VIDEO_URL_HERE`).
3. Replace **`YOUR_DEMO_VIDEO_URL_HERE`** with your full URL, for example:

   ```html
   <a href="https://www.youtube.com/watch?v=xxxxxxxxxxx" title="Watch demo video">
   ```

4. Commit the change. The badge image is static (shields.io); only the **href** must be your real URL.

## Optional: embed a GIF instead

If you prefer no external video host, you can:

1. Convert a short screen recording to a GIF (or use a tool like [asciinema](https://asciinema.org/) for terminal-style demos—not ideal for mobile UI).
2. Add `docs/demo.gif` to the repo (keep file size reasonable, e.g. under 5 MB).
3. In `README.md`, replace the badge block with:

   ```markdown
   ![Demo](docs/demo.gif)
   ```

Use either a video link **or** a GIF—whichever fits your repo size and branding.
