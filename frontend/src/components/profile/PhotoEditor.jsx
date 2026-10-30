import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useUploadPhoto } from "../../hooks/useProfile.js";
import { cropRect, MAX_ZOOM, maxOffsets } from "../../lib/domain/photo.js";
import { loadImage, renderPhoto } from "../../lib/image.js";
import { ErrorAlert } from "../ui/Alert.jsx";
import { Button } from "../ui/Button.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";

const STAGE = 224; // preview size in CSS px

/**
 * Position and zoom a chosen photo, then upload the square crop (PUT /api/me/photo).
 * Drag or use the arrow keys to move it; the circle shows exactly what others will see.
 */
export function PhotoEditor({ file, onCancel, onSaved }) {
  const upload = useUploadPhoto();
  const [image, setImage] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const hintId = useId();
  const zoomId = useId();

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    setLoadError("");
    loadImage(file)
      .then((bitmap) => !cancelled && setImage(bitmap))
      .catch((error) => !cancelled && setLoadError(error.message));
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Keep the square inside the image whenever the zoom changes
  const clampOffset = (next, z = zoom) => {
    if (!image) return next;
    const max = maxOffsets({ width: image.width, height: image.height, zoom: z });
    return { x: Math.min(Math.max(next.x, -max.x), max.x), y: Math.min(Math.max(next.y, -max.y), max.y) };
  };

  // Draw the preview at the screen's pixel density so it stays sharp
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = STAGE * scale;
    canvas.height = STAGE * scale;
    const { sx, sy, size } = cropRect({ width: image.width, height: image.height, zoom, offsetX: offset.x, offsetY: offset.y });
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  }, [image, zoom, offset]);

  // Source pixels per CSS pixel of the preview, to turn a drag into a crop offset
  const sourcePerPixel = () => (image ? cropRect({ width: image.width, height: image.height, zoom }).size / STAGE : 1);

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, start: offset };
  }

  function onPointerMove(event) {
    if (!drag.current) return;
    const k = sourcePerPixel();
    // Dragging the photo right shows more of its left side
    setOffset(clampOffset({ x: drag.current.start.x - (event.clientX - drag.current.x) * k, y: drag.current.start.y - (event.clientY - drag.current.y) * k }));
  }

  function onKeyDown(event) {
    const step = 12 * sourcePerPixel();
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset((current) => clampOffset({ x: current.x + move[0], y: current.y + move[1] }));
  }

  function changeZoom(value) {
    const next = Math.min(Math.max(value, 1), MAX_ZOOM);
    setZoom(next);
    setOffset((current) => clampOffset(current, next));
  }

  async function save() {
    setRenderError("");
    setRendering(true);
    try {
      const blob = await renderPhoto(image, { zoom, offsetX: offset.x, offsetY: offset.y });
      upload.mutate(blob, { onSuccess: onSaved });
    } catch (error) {
      setRenderError(error.message);
    } finally {
      setRendering(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorAlert>{loadError}</ErrorAlert>
        <Button variant="secondary" onClick={onCancel} className="self-start">
          Choose another photo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 motion-safe:animate-pop-in sm:flex-row sm:items-start sm:gap-6">
      {image ? (
        <div
          tabIndex={0}
          role="group"
          aria-label="Photo position"
          aria-describedby={hintId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          className="shrink-0 cursor-grab touch-none rounded-full ring-4 ring-accent-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus active:cursor-grabbing"
        >
          <canvas ref={canvasRef} aria-hidden="true" style={{ width: STAGE, height: STAGE }} className="block rounded-full bg-field" />
        </div>
      ) : (
        <Skeleton className="size-56 shrink-0 rounded-full" />
      )}

      <div className="flex w-full max-w-xs flex-col gap-4">
        <p id={hintId} className="m-0 text-sm text-ink-muted">
          Drag the photo (or use the arrow keys) to position it, and zoom to fit your face in the circle.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor={zoomId} className="text-[13px] font-medium text-ink-soft">
            Zoom
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => changeZoom(zoom - 0.25)} disabled={!image || zoom <= 1}>
              <Minus className="size-4" aria-hidden="true" />
            </Button>
            <input
              id={zoomId}
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!image}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="min-w-0 flex-1 accent-accent"
            />
            <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => changeZoom(zoom + 0.25)} disabled={!image || zoom >= MAX_ZOOM}>
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <ErrorAlert>{renderError || upload.error?.message}</ErrorAlert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} loading={rendering || upload.isPending} disabled={!image}>
            {rendering || upload.isPending ? "Saving" : "Save photo"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={upload.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
