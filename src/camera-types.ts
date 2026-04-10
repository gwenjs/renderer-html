/**
 * @file Local type definitions for camera and viewport integration.
 *
 * These interfaces describe the public contracts of `@gwenjs/camera-core`.
 * They are defined here so that the HTML renderer can integrate with the camera
 * system without a hard dependency — both managers are injected via
 * `engine.tryInject()` and are `undefined` when camera-core is not installed.
 *
 * When `@gwenjs/renderer-core` eventually re-exports these types, the imports
 * in this package should be updated to point there.
 */

/**
 * A normalised [0–1] rectangle describing the pixel region of the render
 * container that a viewport occupies.
 *
 * @example Full screen: `{ x: 0, y: 0, width: 1, height: 1 }`
 * @example Left half:   `{ x: 0, y: 0, width: 0.5, height: 1 }`
 */
export interface ViewportRegion {
  /** Normalised left edge (0 = container left). */
  x: number;
  /** Normalised top edge (0 = container top). */
  y: number;
  /** Normalised width (1 = full container width). */
  width: number;
  /** Normalised height (1 = full container height). */
  height: number;
}

/** The current computed state of a camera bound to a viewport. */
export interface CameraState {
  /** Whether the camera is currently active and should be used for rendering. */
  active: boolean;
  /** Projection parameters. */
  projection: {
    /** Projection type. Only `'orthographic'` is supported by CSS transforms. */
    type: "orthographic" | "perspective" | string;
    /**
     * World units per pixel (orthographic only).
     * 1 = no zoom; 2 = zoomed out 2×; 0.5 = zoomed in 2×.
     */
    zoom: number;
  };
  /** The camera's world-space transform. */
  worldTransform: {
    /** Camera centre in world units. */
    position: { x: number; y: number };
  };
}

/** Manages all active cameras, keyed by viewport ID. */
export interface CameraManager {
  /** Returns the camera state for the given viewport, or `undefined` if absent. */
  get(viewportId: string): CameraState | undefined;
}

/** A resolved viewport context — region and other per-viewport metadata. */
export interface ViewportContext {
  /** Normalised region this viewport occupies in the container. */
  region: ViewportRegion;
}

/** Manages all registered viewports, keyed by viewport ID. */
export interface ViewportManager {
  /** Returns all viewports as a keyed map. */
  getAll(): Map<string, ViewportContext>;
  /** Returns the viewport context for the given ID, or `undefined` if absent. */
  get(id: string): ViewportContext | undefined;
}

// ---------------------------------------------------------------------------
// GwenProvides augmentation — typed engine.tryInject() for camera managers
// ---------------------------------------------------------------------------
declare module "@gwenjs/core" {
  interface GwenProvides {
    /**
     * Provided by `@gwenjs/camera-core`. Available after `engine:init`.
     * Use `engine.tryInject('cameraManager')` to get it without a hard dep.
     */
    cameraManager: CameraManager;
    /**
     * Provided by `@gwenjs/camera-core`. Available after `engine:init`.
     * Use `engine.tryInject('viewportManager')` to get it without a hard dep.
     */
    viewportManager: ViewportManager;
  }

  /**
   * GwenRuntimeHooks augmentation — viewport lifecycle hooks emitted by
   * `@gwenjs/camera-core` (or any package that manages viewports).
   *
   * Declared here so that `HTMLRendererPlugin` can register typed handlers
   * without a hard dependency on `@gwenjs/camera-core`.
   */
  interface GwenRuntimeHooks {
    /** Fired when a new viewport is registered at runtime. */
    "viewport:add": (payload: { id: string; region: ViewportRegion }) => void;
    /** Fired when an existing viewport's region changes. */
    "viewport:resize": (payload: { id: string; region: ViewportRegion }) => void;
    /** Fired when a viewport is removed at runtime. */
    "viewport:remove": (payload: { id: string }) => void;
  }
}
