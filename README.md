# @duocvo/react-native-zoomable-image

A lightweight zoom and pan experience for React Native, built with [Reanimated](https://docs.swmansion.com/react-native-reanimated/) and [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/). It provides a ready-to-use **`Zoomable`** wrapper, a full-screen **`Gallery`** lightbox with horizontal paging, and **`useImageDimensions`** to size remote images before layout.

## 🎬 Demo

[![Demo]()](https://github.com/user-attachments/assets/76d44a4b-3ffe-41aa-86d1-aeadf4d6e5d7)

## Features

- Pinch to zoom, pan when zoomed, double-tap to zoom in/out
- Configurable min/max scale and double-tap scale
- `onZoomChange` / `onZoomStateChange` callbacks for UI sync
- **`Gallery`**: full-screen overlay, swipe between items, optional pan-down-to-close, header/footer slots
- Default gallery cell: `Zoomable` + image when `data` is an array of image sources and you omit `renderItem`
- **`useImageDimensions`**: fetch dimensions for a remote `uri` (or `require`) to avoid layout jump

## Requirements

- React Native **0.72+** (tested with the versions in this repo; adjust as needed)
- [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/) **≥ 3** (follow their Babel plugin setup)
- [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation/) **≥ 2**

The root of your app should be wrapped in `GestureHandlerRootView` (or an equivalent root already provided by your navigation setup). Each `Zoomable` / `Gallery` instance also wraps content appropriately for gesture scope.

## Installation

```sh
yarn add @duocvo/react-native-zoomable-image react-native-reanimated react-native-gesture-handler
```

or

```sh
npm install @duocvo/react-native-zoomable-image react-native-reanimated react-native-gesture-handler
```

Then complete the **Reanimated** and **Gesture Handler** install steps from their official docs (Babel plugin, `import 'react-native-gesture-handler'` at the top of your entry file if required).

## Usage

### Zoomable + remote image size

```tsx
import { Image, StyleSheet, View } from 'react-native';
import { Zoomable, useImageDimensions } from '@duocvo/react-native-zoomable-image';

export function Example() {
  const uri = 'https://picsum.photos/800/1200';
  const { width, height } = useImageDimensions({ uri });

  return (
    <View style={styles.container}>
      <Zoomable
        contentContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}
        minScale={1}
        maxScale={4}
        onZoomStateChange={(zoomed) => console.log('zoomed:', zoomed)}
      >
        <Image source={{ uri }} style={{ width, height }} />
      </Zoomable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

### Gallery (lightbox)

Use a ref to `show` / `hide`, and optionally place `Gallery` inside a `Modal`. For image URLs, you can omit `renderItem` and pass `data` as an array of `{ uri: string }` (or other `ImageSourcePropType` values).

```tsx
import { useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { Gallery, type GalleryRef } from '@duocvo/react-native-zoomable-image';

export function Lightbox() {
  const galleryRef = useRef<GalleryRef>(null);
  const [open, setOpen] = useState(false);
  const data = [{ uri: 'https://example.com/a.jpg' }, { uri: 'https://example.com/b.jpg' }];

  return (
    <View>
      {/* e.g. open on thumbnail press */}
      <Modal visible={open} transparent animationType="fade">
        <Gallery
          ref={galleryRef}
          data={data}
          initialIndex={0}
          onVisibilityChange={(visible) => {
            if (!visible) setOpen(false);
          }}
          renderHeader={({ index, total }) => (
            /* custom header: close button, counter, etc. */
            null
          )}
        />
      </Modal>
    </View>
  );
}
```

Call `galleryRef.current?.show(index)` after the overlay is mounted when you need to open at a specific index (see the example app under `example/`).

## API overview

| Export | Description |
|--------|-------------|
| `Zoomable` | Wraps children with pinch / pan / double-tap gestures |
| `Gallery` | Full-screen paged gallery with optional header, footer, pan-down-to-close |
| `useImageDimensions` | Returns `{ width, height }` for a given image source |
| Types: `ZoomableProps`, `GalleryProps`, `GalleryRef`, `GalleryRenderContext` | TypeScript definitions |

For prop details, see [`src/types.ts`](src/types.ts).

## Example app

From the repository root:

```sh
yarn
yarn example start
# In another terminal:
yarn example ios
# or
yarn example android
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Publishing (maintainers)

Short checklist:

1. Ensure `yarn typecheck`, `yarn lint`, and `yarn test` pass.
2. Log in to npm (`npm login`) and enable 2FA as required by your account.
3. Run `yarn release` (uses [release-it](https://github.com/release-it/release-it)) to bump the version, publish to npm, and create a Git tag / GitHub release when configured.

Full step-by-step notes: [`docs/PUBLISHING.md`](docs/PUBLISHING.md)

## License

MIT — see [LICENSE](LICENSE).

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
