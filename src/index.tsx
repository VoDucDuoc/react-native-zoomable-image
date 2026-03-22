import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type PropsWithChildren,
  type ReactElement,
  type Ref,
} from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type ListRenderItem,
} from 'react-native';
import {
  FlatList,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import styles from './styles';
import { GalleryDefaultImage } from './GalleryDefaultImage';
import { useZoomGesture as useHandleGesture } from './hooks';
import type {
  GalleryFlatListProps,
  GalleryProps,
  GalleryRef,
  GalleryRenderContext,
  ZoomableProps,
} from './types';
import { shallowEqualRecord } from './utils';
import {
  GALLERY_PAN_DOWN_CLOSE_DISTANCE,
  GALLERY_PAN_DOWN_CLOSE_VELOCITY,
  GALLERY_PRESENT_DELAY_MS,
  GALLERY_SLIDE_DURATION_MS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SPRING_CONFIG,
  VERTICAL_ACTIVATION_THRESHOLD,
} from './constants';

/** Same curve + duration for open and every dismiss (button + pan) so motion feels consistent. */
const GALLERY_SLIDE_EASING = Easing.bezier(0.33, 1, 0.68, 1);

const gallerySlideTransition = {
  duration: GALLERY_SLIDE_DURATION_MS,
  easing: GALLERY_SLIDE_EASING,
};

const galleryKeyExtractor = (_: unknown, index: number) => `gallery-${index}`;

function useStableFlatListExtras(
  extras: Record<string, unknown>
): Record<string, unknown> {
  const ref = useRef(extras);
  if (shallowEqualRecord(ref.current, extras)) {
    return ref.current;
  }
  ref.current = extras;
  return extras;
}

/** Avoids TS2589 (deep instantiation) on `Animated.View` with mixed style array */
const GalleryAnimatedView = Animated.View as any;
const ZoomableAnimatedView = Animated.View as any;

function galleryFlatListPropsAreEqual(
  prev: Readonly<GalleryFlatListProps>,
  next: Readonly<GalleryFlatListProps>
): boolean {
  return (
    prev.data === next.data &&
    prev.renderItem === next.renderItem &&
    prev.initialScrollIndex === next.initialScrollIndex &&
    prev.getItemLayout === next.getItemLayout &&
    prev.onViewableItemsChanged === next.onViewableItemsChanged &&
    prev.viewabilityConfig === next.viewabilityConfig &&
    prev.flatListExtras === next.flatListExtras
  );
}

const GalleryFlatList = memo(
  forwardRef<FlatList, GalleryFlatListProps>(function GalleryFlatList(
    props,
    ref
  ) {
    return (
      <FlatList
        {...props.flatListExtras}
        ref={ref}
        data={props.data as any}
        renderItem={props.renderItem}
        keyExtractor={galleryKeyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces
        getItemLayout={props.getItemLayout}
        initialScrollIndex={props.initialScrollIndex}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        viewabilityConfig={props.viewabilityConfig}
        onViewableItemsChanged={props.onViewableItemsChanged}
      />
    );
  }),
  galleryFlatListPropsAreEqual
);

export const Zoomable = ({
  contentContainerStyle,
  children,
  onZoomChange,
  onZoomStateChange,
  ...rest
}: PropsWithChildren<ZoomableProps>) => {
  const {
    gestureHandler,
    onLayout,
    onLayoutAnimatedView,
    scale,
    translateX,
    translateY,
    isZoomed,
  } = useHandleGesture({ ...rest });

  useAnimatedReaction(
    () => scale.value,
    (currentScale, previousScale) => {
      if (onZoomChange && currentScale !== previousScale)
        runOnJS(onZoomChange)(currentScale);
    },
    [onZoomChange]
  );

  useAnimatedReaction(
    () => isZoomed.value,
    (currentIsZoomed, previousIsZoomed) => {
      if (onZoomStateChange && currentIsZoomed !== previousIsZoomed)
        runOnJS(onZoomStateChange)(currentIsZoomed);
    },
    [onZoomStateChange]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gestureHandler}>
        <View style={styles.container} onLayout={onLayout}>
          <ZoomableAnimatedView
            style={[animatedStyle, contentContainerStyle]}
            onLayout={onLayoutAnimatedView}
          >
            {children}
          </ZoomableAnimatedView>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const DefaultGalleryPage = memo(
  function DefaultGalleryPage({
    item,
    imageStyle,
  }: {
    item: ImageSourcePropType;
    imageStyle?: ImageStyle;
  }) {
    return (
      <Zoomable>
        <GalleryDefaultImage source={item} style={imageStyle} />
      </Zoomable>
    );
  },
  (prev, next) => prev.item === next.item && prev.imageStyle === next.imageStyle
);

type GalleryOverlayProps = {
  index: number;
  total: number;
  renderHeader?: (context: GalleryRenderContext) => React.ReactNode;
  renderFooter?: (context: GalleryRenderContext) => React.ReactNode;
  hideHeaderAnimated: ReturnType<typeof useAnimatedStyle>;
  hideFooterAnimated: ReturnType<typeof useAnimatedStyle>;
};

function galleryOverlayAreEqual(
  prev: Readonly<GalleryOverlayProps>,
  next: Readonly<GalleryOverlayProps>
): boolean {
  return (
    prev.index === next.index &&
    prev.total === next.total &&
    prev.renderHeader === next.renderHeader &&
    prev.renderFooter === next.renderFooter &&
    prev.hideHeaderAnimated === next.hideHeaderAnimated &&
    prev.hideFooterAnimated === next.hideFooterAnimated
  );
}

const GalleryOverlay = memo(function GalleryOverlay({
  index,
  total,
  renderHeader,
  renderFooter,
  hideHeaderAnimated,
  hideFooterAnimated,
}: GalleryOverlayProps) {
  const context = useMemo(
    (): GalleryRenderContext => ({ index, total }),
    [index, total]
  );

  return (
    <>
      {renderHeader && (
        <GalleryAnimatedView
          style={[styles.headerContainer, hideHeaderAnimated]}
          pointerEvents="box-none"
        >
          {renderHeader(context)}
        </GalleryAnimatedView>
      )}
      {renderFooter && (
        <GalleryAnimatedView
          style={[styles.footerContainer, hideFooterAnimated]}
          pointerEvents="box-none"
        >
          {renderFooter(context)}
        </GalleryAnimatedView>
      )}
    </>
  );
},
galleryOverlayAreEqual);

function GalleryInner<T = ImageSourcePropType>(
  galleryProps: GalleryProps<T>,
  ref: ForwardedRef<GalleryRef>
) {
  const {
    data = [],
    imageStyle,
    containerStyle,
    backdropColor = 'black',
    initialIndex = 0,
    enablePanDownToClose = true,
    panDownToCloseDistance = GALLERY_PAN_DOWN_CLOSE_DISTANCE,
    onPanDownToClose,
    onVisibilityChange,
    renderHeader,
    renderFooter,
    renderItem: userRenderItem,
    onViewableItemsChanged: userOnViewableItemsChanged,
    ...flatListRest
  } = galleryProps;
  const flatListRef = useRef<FlatList>(null);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const layoutTranslateY = useSharedValue(0);

  const [isVisible, setIsVisible] = useState(false);
  const hasBeenVisibleRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  /** Only updated when opening / syncing props — not when swiping — so FlatList memo stays valid. */
  const [scrollAnchorIndex, setScrollAnchorIndex] = useState(initialIndex);
  const syncedIndexRef = useRef(initialIndex);

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60 }),
    []
  );

  const onViewableItemsChanged = useCallback(
    (info: {
      viewableItems: Array<{ index?: number | null }>;
      changed: Array<{ index?: number | null }>;
    }) => {
      const first = info.viewableItems[0];
      if (first?.index != null && first.index !== syncedIndexRef.current) {
        syncedIndexRef.current = first.index;
        setCurrentIndex(first.index);
      }
      userOnViewableItemsChanged?.(info as any);
    },
    [userOnViewableItemsChanged]
  );

  useEffect(() => {
    syncedIndexRef.current = initialIndex;
    setScrollAnchorIndex(initialIndex);
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isVisible) {
      hasBeenVisibleRef.current = true;
      onVisibilityChange?.(true);
    } else if (hasBeenVisibleRef.current) {
      hasBeenVisibleRef.current = false;
      onVisibilityChange?.(false);
    }
  }, [isVisible, onVisibilityChange]);

  const initialScrollIndexForList = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.min(Math.max(0, scrollAnchorIndex), data.length - 1);
  }, [scrollAnchorIndex, data.length]);

  useEffect(() => {
    if (data.length > 0 && currentIndex >= data.length) {
      const next = data.length - 1;
      syncedIndexRef.current = next;
      setScrollAnchorIndex(next);
      setCurrentIndex(next);
    }
  }, [data.length, currentIndex]);

  const dismissAfterAnimation = useCallback(() => {
    setIsVisible(false);
    onPanDownToClose?.();
  }, [onPanDownToClose]);

  const show = useCallback(
    (index: number = 0) => {
      layoutTranslateY.value = 0;
      const safeIndex = Math.max(0, index);
      syncedIndexRef.current = safeIndex;
      setScrollAnchorIndex(safeIndex);
      setCurrentIndex(safeIndex);
      setIsVisible(true);
      translateY.value = withDelay(
        GALLERY_PRESENT_DELAY_MS,
        withTiming(0, gallerySlideTransition)
      );
    },
    [translateY, layoutTranslateY]
  );

  const hide = useCallback(() => {
    layoutTranslateY.value = 0;
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      gallerySlideTransition,
      (finished) => {
        if (finished) {
          runOnJS(dismissAfterAnimation)();
        }
      }
    );
  }, [translateY, layoutTranslateY, dismissAfterAnimation]);

  useImperativeHandle(
    ref,
    () => ({
      show,
      hide,
      isVisible,
    }),
    [show, hide, isVisible]
  );

  const defaultRenderItem = useCallback<ListRenderItem<ImageSourcePropType>>(
    ({ item }) => <DefaultGalleryPage item={item} imageStyle={imageStyle} />,
    [imageStyle]
  );

  const listRenderItem = (userRenderItem ??
    defaultRenderItem) as ListRenderItem<T>;

  const flatListExtrasStable = useStableFlatListExtras(
    flatListRest as Record<string, unknown>
  );

  const transformAnimated = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + layoutTranslateY.value }],
  }));

  const backdropAnimated = useAnimatedStyle(() => ({
    backgroundColor: backdropColor,
    opacity: interpolate(
      layoutTranslateY.value,
      [-VERTICAL_ACTIVATION_THRESHOLD, 0, VERTICAL_ACTIVATION_THRESHOLD],
      [0.9, 1, 0.9],
      'clamp'
    ),
  }));

  const hideHeaderAnimated = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          layoutTranslateY.value,
          [
            -VERTICAL_ACTIVATION_THRESHOLD * 2,
            0,
            VERTICAL_ACTIVATION_THRESHOLD * 2,
          ],
          [-50, 0, -50],
          'clamp'
        ),
      },
    ],
    opacity: interpolate(
      layoutTranslateY.value,
      [-VERTICAL_ACTIVATION_THRESHOLD, 0, VERTICAL_ACTIVATION_THRESHOLD],
      [0, 1, 0]
    ),
  }));

  const hideFooterAnimated = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          layoutTranslateY.value,
          [
            -VERTICAL_ACTIVATION_THRESHOLD * 2,
            0,
            VERTICAL_ACTIVATION_THRESHOLD * 2,
          ],
          [50, 0, 50],
          'clamp'
        ),
      },
    ],
    opacity: interpolate(
      layoutTranslateY.value,
      [-VERTICAL_ACTIVATION_THRESHOLD, 0, VERTICAL_ACTIVATION_THRESHOLD],
      [0, 1, 0]
    ),
  }));

  const panDownToCloseGesture = useMemo(() => {
    const dismissDistance = panDownToCloseDistance;
    return Gesture.Pan()
      .enabled(enablePanDownToClose)
      .activeOffsetY(12)
      .failOffsetX([-40, 40])
      .onUpdate((e) => {
        'worklet';
        const t = e.translationY;
        if (t > 0) {
          layoutTranslateY.value = t;
        } else {
          layoutTranslateY.value = t * 0.35;
        }
      })
      .onEnd((e) => {
        'worklet';
        const shouldClose =
          layoutTranslateY.value > dismissDistance ||
          e.velocityY > GALLERY_PAN_DOWN_CLOSE_VELOCITY;
        if (shouldClose) {
          translateY.value = translateY.value + layoutTranslateY.value;
          layoutTranslateY.value = 0;
          translateY.value = withTiming(
            SCREEN_HEIGHT,
            gallerySlideTransition,
            (finished) => {
              if (finished) {
                runOnJS(dismissAfterAnimation)();
              }
            }
          );
        } else {
          layoutTranslateY.value = withSpring(0, SPRING_CONFIG);
        }
      });
  }, [
    enablePanDownToClose,
    panDownToCloseDistance,
    dismissAfterAnimation,
    translateY,
    layoutTranslateY,
  ]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  if (data.length === 0 || !isVisible) {
    return null;
  }

  return (
    <GestureHandlerRootView style={[StyleSheet.absoluteFillObject]}>
      <GalleryAnimatedView
        style={[styles.galleryContainer, containerStyle, transformAnimated]}
      >
        <GalleryAnimatedView
          style={[StyleSheet.absoluteFillObject, backdropAnimated]}
        />
        <GestureDetector gesture={panDownToCloseGesture}>
          <View style={styles.galleryGestureLayer}>
            <GalleryFlatList
              ref={flatListRef}
              data={data as unknown[]}
              renderItem={listRenderItem as ListRenderItem<any>}
              initialScrollIndex={initialScrollIndexForList}
              getItemLayout={getItemLayout}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              flatListExtras={flatListExtrasStable}
            />
            {(renderHeader || renderFooter) && (
              <GalleryOverlay
                index={currentIndex}
                total={data.length}
                renderHeader={renderHeader}
                renderFooter={renderFooter}
                hideHeaderAnimated={hideHeaderAnimated}
                hideFooterAnimated={hideFooterAnimated}
              />
            )}
          </View>
        </GestureDetector>
      </GalleryAnimatedView>
    </GestureHandlerRootView>
  );
}

export const Gallery = forwardRef(GalleryInner) as <T = ImageSourcePropType>(
  props: GalleryProps<T> & { ref?: Ref<GalleryRef> }
) => ReactElement | null;

export type {
  GalleryProps,
  GalleryRef,
  GalleryRenderContext,
  ZoomableProps,
} from './types';
export { useImageDimensions } from './hooks';
