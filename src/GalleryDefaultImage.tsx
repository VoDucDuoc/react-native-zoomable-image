import { memo } from 'react';
import { Image } from 'react-native';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { SCREEN_WIDTH } from './constants';
import { useImageDimensions } from './hooks';

export interface GalleryDefaultImageProps {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
}

/**
 * Default image cell for `Gallery`: sizes the image using the same rule as
 * `useImageDimensions` / `useGalleryImageDimensions` (width = screen width,
 * height scaled proportionally). Pass extra `style` to override or extend.
 */
function GalleryDefaultImageImpl({ source, style }: GalleryDefaultImageProps) {
  const { width, height } = useImageDimensions(source);

  const sizeStyle =
    width > 0 && height > 0
      ? { width, height }
      : { width: SCREEN_WIDTH, aspectRatio: 1 };

  return <Image source={source} style={[sizeStyle, style]} />;
}

function sameSource(a: ImageSourcePropType, b: ImageSourcePropType): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    if ('uri' in a && 'uri' in b) {
      return (
        typeof a.uri === 'string' &&
        typeof b.uri === 'string' &&
        a.uri === b.uri
      );
    }
  }
  return false;
}

export const GalleryDefaultImage = memo(
  GalleryDefaultImageImpl,
  (prev, next) =>
    sameSource(prev.source, next.source) && prev.style === next.style
);
