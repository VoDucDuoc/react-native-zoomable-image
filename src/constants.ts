import { Dimensions } from "react-native"

export const MAX_SCALE = 4
export const MIN_SCALE = 0.5

export const DOUBLE_TAP_SCALE = 2

export const ANIMATION_DURATION = 350

/** Stagger before gallery slides up on open (ms). */
export const GALLERY_PRESENT_DELAY_MS = 200
/** Duration for gallery slide in and all dismiss paths (close, pan) — keep in sync for UX. */
export const GALLERY_SLIDE_DURATION_MS = 250

export const TAP_MAX_DELTA = 25
export const RUBBER_BAND_FACTOR = 0.55

export const SPRING_CONFIG = {
  damping: 20,
  stiffness: 250,
  mass: 0.5,
  overshootClamping: false,
}

/** Scales pan-release inertia so quick flicks do not overshoot as aggressively (Reanimated `withDecay` default factor is 1). */
export const PAN_DECAY_VELOCITY_FACTOR = 0.32;
/** Caps raw pan end velocity (px/s) before scaling — limits aggressive flicks. */
export const PAN_DECAY_MAX_INPUT_VELOCITY = 1400;
/** Friction for pan inertia; Reanimated default is 0.998 — lower values stop sooner. */
export const PAN_DECAY_DECELERATION = 0.991;
/** Snap-back duration when releasing past pan bounds (rubber band / corner). */
export const PAN_BOUNDARY_SNAP_DURATION_MS = 180;

export const DIMENSIONS = Dimensions.get('window');
export const SCREEN_WIDTH = DIMENSIONS.width;
export const SCREEN_HEIGHT = DIMENSIONS.height;
export const VERTICAL_ACTIVATION_THRESHOLD = 10;

/** Drag distance (px) past which pan-down-to-close completes on release. */
export const GALLERY_PAN_DOWN_CLOSE_DISTANCE = 120;
/** Downward velocity (px/s) past which pan-down-to-close completes. */
export const GALLERY_PAN_DOWN_CLOSE_VELOCITY = 900;