import {
  type FlatListProps,
  type ImageSourcePropType,
  type ImageStyle,
  type LayoutChangeEvent,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type ComposedGesture } from 'react-native-gesture-handler';
import { type SharedValue, withTiming } from 'react-native-reanimated';

export type AnimationConfigProps = Parameters<typeof withTiming>[1];

export interface DoubleTapConfig {
  defaultScale?: number;
  minScale?: number;
  maxScale?: number;
}

export interface UseHandleGestureProps {
  animationConfig?: AnimationConfigProps;
  doubleTapConfig?: DoubleTapConfig;
  minScale?: number;
  maxScale?: number;
}

export interface UseZoomGestureReturn {
  gestureHandler: ComposedGesture;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  onLayout: (event: LayoutChangeEvent) => void;
  onLayoutAnimatedView: (event: LayoutChangeEvent) => void;
  isZoomed: SharedValue<boolean>;
}

export interface ZoomableProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  minScale?: number;
  maxScale?: number;
  doubleTapConfig?: DoubleTapConfig;
  /**
   * Callback fired when zoom state changes (zoomed in or out).
   * Called with true when zoomed in, false when zoomed out to initial scale.
   */
  onZoomStateChange?: (isZoomed: boolean) => void;
  /**
   * Callback fired during zoom gesture with current scale value.
   * Called continuously while pinching, useful for UI updates (e.g., showing zoom percentage).
   * Note: For performance-critical use cases, use useZoomGesture hook with scale SharedValue instead.
   */
  onZoomChange?: (scale: number) => void;
}

export interface GalleryRef {
  /** Show the gallery at the specified index */
  show: (index?: number) => void;
  /** Hide the gallery */
  hide: () => void;
  /** Whether the gallery is currently visible */
  isVisible: boolean;
}

export interface GalleryRenderContext {
  /** Zero-based index of the currently visible item */
  index: number;
  /** Total number of items */
  total: number;
}

type GalleryOwnPropsBase = {
  /**
   * Applied to `<Image />` in the **default** cell only (when `renderItem` is omitted).
   */
  imageStyle?: ImageStyle;
  containerStyle?: ViewStyle;
  /**
   * Passed to `Zoomable` in the **default** cell only (when `renderItem` is omitted).
   */
  contentContainerStyle?: ViewStyle;
  backdropColor?: string;
  initialIndex?: number;
  /**
   * When true, dragging the gallery downward dismisses it (like a lightbox).
   * Default: true.
   */
  enablePanDownToClose?: boolean;
  /**
   * Drag distance (px) required to dismiss when velocity is low.
   * Defaults to `GALLERY_PAN_DOWN_CLOSE_DISTANCE` from constants.
   */
  panDownToCloseDistance?: number;
  /**
   * Called when the gallery is dismissed via pan-down-to-close (not when `hide()` is called).
   */
  onPanDownToClose?: () => void;
  /**
   * Called when the overlay becomes visible or hidden (after `show` / `hide` / pan-down dismiss).
   * Skips the initial hidden state on mount so parents can sync e.g. a `Modal` without closing immediately.
   */
  onVisibilityChange?: (visible: boolean) => void;
  renderHeader?: (context: GalleryRenderContext) => React.ReactNode;
  renderFooter?: (context: GalleryRenderContext) => React.ReactNode;
};

/**
 * When `T` is assignable to `ImageSourcePropType`, you may omit `renderItem` and the gallery
 * renders each item as `Zoomable` + `<Image source={item} />`.
 * For other item types, pass `renderItem` and wrap content in `Zoomable` when you need zoom.
 */
export type GalleryProps<T = ImageSourcePropType> = Omit<
  FlatListProps<T>,
  'data' | 'renderItem'
> &
  GalleryOwnPropsBase &
  (T extends ImageSourcePropType
    ? {
        data: T[];
        renderItem?: ListRenderItem<T>;
      }
    : {
        data: T[];
        renderItem: ListRenderItem<T>;
      });

export type GalleryFlatListProps = {
  data: unknown[];
  renderItem: ListRenderItem<any>;
  initialScrollIndex: number;
  getItemLayout: (
    _data: ArrayLike<unknown> | null | undefined,
    index: number
  ) => { length: number; offset: number; index: number };
  onViewableItemsChanged: (info: {
    viewableItems: Array<{ index?: number | null }>;
    changed: Array<{ index?: number | null }>;
  }) => void;
  viewabilityConfig: { itemVisiblePercentThreshold: number };
  flatListExtras: Record<string, unknown>;
};
