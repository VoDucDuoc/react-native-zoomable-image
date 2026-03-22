import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  type GestureStateChangeEvent,
  type GestureTouchEvent,
  type GestureUpdateEvent,
  type PanGestureHandlerEventPayload,
  type PinchGestureHandlerEventPayload,
  State,
} from 'react-native-gesture-handler';
import type { GestureStateManagerType } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/gestureStateManager';
import {
  Easing,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ANIMATION_DURATION,
  MAX_SCALE,
  TAP_MAX_DELTA,
  DOUBLE_TAP_SCALE,
  RUBBER_BAND_FACTOR,
  SPRING_CONFIG,
  MIN_SCALE,
  PAN_BOUNDARY_SNAP_DURATION_MS,
  PAN_DECAY_DECELERATION,
  PAN_DECAY_MAX_INPUT_VELOCITY,
  PAN_DECAY_VELOCITY_FACTOR,
  SCREEN_WIDTH,
} from './constants';
import { clamp, type Dimensions } from './utils';
import type {
  AnimationConfigProps,
  UseHandleGestureProps,
  UseZoomGestureReturn,
} from './types';

export const useZoomGesture = (
  props: UseHandleGestureProps = {}
): UseZoomGestureReturn => {
  const {
    animationConfig,
    doubleTapConfig,
    minScale = 1,
    maxScale = MAX_SCALE,
  } = props;

  const scale = useSharedValue(1);
  const lastScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const isPinching = useSharedValue(false);
  const isPanning = useSharedValue(false);
  const isZoomedIn = useSharedValue(false);

  const containerDimensions = useSharedValue<Dimensions>({
    width: 0,
    height: 0,
  });
  const contentDimensions = useSharedValue<Dimensions>({ width: 1, height: 1 });

  const runAnimation = useCallback(
    (toValue: number, config?: AnimationConfigProps) => {
      'worklet';
      return withTiming(toValue, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        ...config,
        ...animationConfig,
      });
    },
    [animationConfig]
  );

  const getTranslateBounds = useCallback(
    (currentScale: number): { maxX: number; maxY: number } => {
      'worklet';
      const container = containerDimensions.value;
      const content = contentDimensions.value;

      const scaledWidth = content.width * currentScale;
      const scaledHeight = content.height * currentScale;

      const excessWidth = Math.max(0, scaledWidth - container.width);
      const excessHeight = Math.max(0, scaledHeight - container.height);

      const safetyPadding = 1;
      return {
        maxX: Math.max(0, Math.floor(excessWidth / 2) - safetyPadding),
        maxY: Math.max(0, Math.floor(excessHeight / 2) - safetyPadding),
      };
    },
    [containerDimensions, contentDimensions]
  );

  const clampTranslation = useCallback(
    (
      tx: number,
      ty: number,
      currentScale: number
    ): { x: number; y: number } => {
      'worklet';
      const bounds = getTranslateBounds(currentScale);
      return {
        x: clamp(tx, -bounds.maxX, bounds.maxX),
        y: clamp(ty, -bounds.maxY, bounds.maxY),
      };
    },
    [getTranslateBounds]
  );

  const rubberBand = useCallback(
    (value: number, min: number, max: number, dimension: number): number => {
      'worklet';
      if (value < min) {
        const overscroll = min - value;
        return (
          min -
          (1 - 1 / ((overscroll * RUBBER_BAND_FACTOR) / dimension + 1)) *
            dimension
        );
      }
      if (value > max) {
        const overscroll = value - max;
        return (
          max +
          (1 - 1 / ((overscroll * RUBBER_BAND_FACTOR) / dimension + 1)) *
            dimension
        );
      }
      return value;
    },
    []
  );

  const applyRubberBandTranslation = useCallback(
    (
      tx: number,
      ty: number,
      currentScale: number
    ): { x: number; y: number } => {
      'worklet';
      const container = containerDimensions.value;
      const bounds = getTranslateBounds(currentScale);

      return {
        x: rubberBand(tx, -bounds.maxX, bounds.maxX, container.width),
        y: rubberBand(ty, -bounds.maxY, bounds.maxY, container.height),
      };
    },
    [containerDimensions, getTranslateBounds, rubberBand]
  );

  const applyBoundaryConstraints = useCallback(
    (targetScale: number, animate: boolean = true): void => {
      'worklet';

      const clampedScale = clamp(targetScale, minScale, maxScale);
      const { x: clampedX, y: clampedY } = clampTranslation(
        translateX.value,
        translateY.value,
        clampedScale
      );

      if (animate) {
        scale.value = withSpring(clampedScale, SPRING_CONFIG);
        translateX.value = withSpring(clampedX, SPRING_CONFIG);
        translateY.value = withSpring(clampedY, SPRING_CONFIG);
      } else {
        scale.value = clampedScale;
        translateX.value = clampedX;
        translateY.value = clampedY;
      }

      lastScale.value = clampedScale;
      lastTranslateX.value = clampedX;
      lastTranslateY.value = clampedY;

      isZoomedIn.value = clampedScale > minScale;
    },
    [
      scale,
      translateX,
      translateY,
      lastScale,
      lastTranslateX,
      lastTranslateY,
      isZoomedIn,
      clampTranslation,
      minScale,
      maxScale,
    ]
  );

  const zoomIn = useCallback(
    (focalX: number, focalY: number): void => {
      'worklet';

      const container = containerDimensions.value;
      const targetScale =
        doubleTapConfig?.defaultScale ??
        doubleTapConfig?.minScale ??
        DOUBLE_TAP_SCALE;

      const clampedTargetScale = clamp(
        targetScale,
        doubleTapConfig?.minScale ?? minScale,
        doubleTapConfig?.maxScale ?? maxScale
      );

      const centerX = container.width / 2;
      const centerY = container.height / 2;

      const currentScale = scale.value;
      const currentTx = translateX.value;
      const currentTy = translateY.value;

      const focalOffsetX = focalX - centerX;
      const focalOffsetY = focalY - centerY;

      const contentPointX = (focalOffsetX - currentTx) / currentScale;
      const contentPointY = (focalOffsetY - currentTy) / currentScale;

      let newTx = focalOffsetX - contentPointX * clampedTargetScale;
      let newTy = focalOffsetY - contentPointY * clampedTargetScale;

      const clamped = clampTranslation(newTx, newTy, clampedTargetScale);
      newTx = clamped.x;
      newTy = clamped.y;

      scale.value = runAnimation(clampedTargetScale);
      translateX.value = runAnimation(newTx);
      translateY.value = runAnimation(newTy);

      lastScale.value = clampedTargetScale;
      lastTranslateX.value = newTx;
      lastTranslateY.value = newTy;

      isZoomedIn.value = true;
    },
    [
      containerDimensions,
      scale,
      translateX,
      translateY,
      lastScale,
      lastTranslateX,
      lastTranslateY,
      isZoomedIn,
      doubleTapConfig,
      runAnimation,
      clampTranslation,
      minScale,
      maxScale,
    ]
  );

  const zoomOut = useCallback((): void => {
    'worklet';

    scale.value = runAnimation(minScale);
    translateX.value = runAnimation(0);
    translateY.value = runAnimation(0);

    lastScale.value = minScale;
    lastTranslateX.value = 0;
    lastTranslateY.value = 0;

    isZoomedIn.value = false;
  }, [
    scale,
    translateX,
    translateY,
    lastScale,
    lastTranslateX,
    lastTranslateY,
    isZoomedIn,
    runAnimation,
    minScale,
  ]);

  const onDoubleTap = useCallback(
    (x: number, y: number): void => {
      'worklet';
      if (isZoomedIn.value) zoomOut();
      else zoomIn(x, y);
    },
    [isZoomedIn, zoomIn, zoomOut]
  );

  const onLayout = useCallback(
    ({
      nativeEvent: {
        layout: { width, height },
      },
    }: LayoutChangeEvent): void => {
      containerDimensions.value = { width, height };
    },
    [containerDimensions]
  );

  const onLayoutAnimatedView = useCallback(
    ({
      nativeEvent: {
        layout: { width, height },
      },
    }: LayoutChangeEvent): void => {
      contentDimensions.value = { width, height };
    },
    [contentDimensions]
  );

  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDeltaX(TAP_MAX_DELTA)
    .maxDeltaY(TAP_MAX_DELTA)
    .onEnd((event) => {
      'worklet';
      onDoubleTap(event.x, event.y);
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e: GestureTouchEvent, state: GestureStateManagerType) => {
      'worklet';
      if (e.state === State.ACTIVE) return;

      if (([State.UNDETERMINED, State.BEGAN] as State[]).includes(e.state)) {
        const zoomed = scale.value > minScale + 0.01;
        if (e.numberOfTouches === 2) {
          state.activate();
          return;
        }
        if (!zoomed) {
          state.fail();
          return;
        }
        state.activate();
      }
    })
    .onStart(() => {
      'worklet';
      isPanning.value = true;
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    })
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      'worklet';

      const newTx = lastTranslateX.value + event.translationX;
      const newTy = lastTranslateY.value + event.translationY;

      const rubber = applyRubberBandTranslation(newTx, newTy, scale.value);

      translateX.value = rubber.x;
      translateY.value = rubber.y;
    })
    .onEnd((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      isPanning.value = false;

      const currentScale = scale.value;
      const bounds = getTranslateBounds(currentScale);

      const currentTx = translateX.value;
      const currentTy = translateY.value;
      const isOutOfBoundsX =
        currentTx < -bounds.maxX || currentTx > bounds.maxX;
      const isOutOfBoundsY =
        currentTy < -bounds.maxY || currentTy > bounds.maxY;

      const snapBoundary = {
        duration: PAN_BOUNDARY_SNAP_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      };

      if (isOutOfBoundsX || isOutOfBoundsY) {
        translateX.value = withTiming(
          clamp(currentTx, -bounds.maxX, bounds.maxX),
          snapBoundary
        );
        translateY.value = withTiming(
          clamp(currentTy, -bounds.maxY, bounds.maxY),
          snapBoundary
        );
      } else {
        const vx =
          Math.sign(event.velocityX) *
          Math.min(Math.abs(event.velocityX), PAN_DECAY_MAX_INPUT_VELOCITY);
        const vy =
          Math.sign(event.velocityY) *
          Math.min(Math.abs(event.velocityY), PAN_DECAY_MAX_INPUT_VELOCITY);

        translateX.value = withDecay({
          velocity: vx,
          velocityFactor: PAN_DECAY_VELOCITY_FACTOR,
          deceleration: PAN_DECAY_DECELERATION,
          clamp: [-bounds.maxX, bounds.maxX],
          rubberBandEffect: true,
          rubberBandFactor: 0.6,
        });

        translateY.value = withDecay({
          velocity: vy,
          velocityFactor: PAN_DECAY_VELOCITY_FACTOR,
          deceleration: PAN_DECAY_DECELERATION,
          clamp: [-bounds.maxY, bounds.maxY],
          rubberBandEffect: true,
          rubberBandFactor: 0.6,
        });
      }

      lastTranslateX.value = clamp(
        lastTranslateX.value + event.translationX,
        -bounds.maxX,
        bounds.maxX
      );
      lastTranslateY.value = clamp(
        lastTranslateY.value + event.translationY,
        -bounds.maxY,
        bounds.maxY
      );
    })
    .onTouchesCancelled(() => {
      'worklet';
      isPanning.value = false;
    })
    .minDistance(0)
    .minPointers(1)
    .maxPointers(2);

  const pinchGesture = Gesture.Pinch()
    .onTouchesDown((e: GestureTouchEvent, state: GestureStateManagerType) => {
      'worklet';
      if (e.numberOfTouches === 2) state.activate();
    })
    .onStart((event: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      'worklet';
      isPinching.value = true;

      lastScale.value = scale.value;
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;

      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate((event: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      'worklet';

      const container = containerDimensions.value;
      const centerX = container.width / 2;
      const centerY = container.height / 2;

      let newScale = lastScale.value * event.scale;
      if (newScale < minScale) {
        const overZoom = minScale - newScale;
        newScale = minScale - overZoom * RUBBER_BAND_FACTOR;
        newScale = Math.max(newScale, minScale * MIN_SCALE);
      } else if (newScale > maxScale) {
        const overZoom = newScale - maxScale;
        newScale = maxScale + overZoom * RUBBER_BAND_FACTOR;
        newScale = Math.min(newScale, maxScale * 1.5);
      }

      const currentFocalX = event.focalX;
      const currentFocalY = event.focalY;

      const focalBlend = 0.3;
      const effectiveFocalX =
        focalX.value + (currentFocalX - focalX.value) * focalBlend;
      const effectiveFocalY =
        focalY.value + (currentFocalY - focalY.value) * focalBlend;

      const focalOffsetX = effectiveFocalX - centerX;
      const focalOffsetY = effectiveFocalY - centerY;

      const scaleRatio = newScale / lastScale.value;
      const newTx =
        focalOffsetX * (1 - scaleRatio) + lastTranslateX.value * scaleRatio;
      const newTy =
        focalOffsetY * (1 - scaleRatio) + lastTranslateY.value * scaleRatio;

      scale.value = newScale;
      translateX.value = newTx;
      translateY.value = newTy;
    })
    .onEnd(() => {
      'worklet';
      isPinching.value = false;

      const wasZoomed = isZoomedIn.value;

      applyBoundaryConstraints(scale.value, true);

      const finalScale = clamp(scale.value, minScale, maxScale);
      const isNowZoomed = finalScale > minScale;
      if (wasZoomed !== isNowZoomed) isZoomedIn.value = isNowZoomed;
    });

  const gestureHandler = Gesture.Simultaneous(
    tapGesture,
    panGesture,
    pinchGesture
  );

  return {
    gestureHandler,
    onLayout,
    onLayoutAnimatedView,
    isZoomed: isZoomedIn,
    scale,
    translateX,
    translateY,
  };
};

/** Scales intrinsic size so width matches the screen width (same rule as the gallery default image). */
export const scaleDimensionsToScreenWidth = (
  width: number,
  height: number
): Dimensions => {
  const newWidth = SCREEN_WIDTH;
  const newHeight = (height * newWidth) / width;
  return { width: newWidth, height: newHeight };
};

/**
 * Like `useImageDimensions` for remote URIs; also supports `require()`-style numeric sources
 * via `Image.resolveAssetSource`. Used by the gallery default image component.
 */
export const useImageDimensions = (source: ImageSourcePropType): Dimensions => {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (typeof source === 'number') {
      const resolved = Image.resolveAssetSource(source);
      if (
        resolved?.width != null &&
        resolved.width > 0 &&
        resolved?.height != null &&
        resolved.height > 0
      ) {
        setDimensions(
          scaleDimensionsToScreenWidth(resolved.width, resolved.height)
        );
      } else {
        setDimensions({ width: 0, height: 0 });
      }
      return;
    }
    if (
      typeof source === 'object' &&
      source !== null &&
      'uri' in source &&
      typeof source.uri === 'string' &&
      source.uri.length > 0
    ) {
      Image.getSize(source.uri, (width, height) => {
        setDimensions(scaleDimensionsToScreenWidth(width, height));
      });
      return;
    }
    setDimensions({ width: 0, height: 0 });
  }, [source]);

  return dimensions;
};
