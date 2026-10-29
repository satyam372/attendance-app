import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cropRect, MAX_INPUT_BYTES, maxOffsets, photoFileError } from "./photo.js";

describe("photoFileError", () => {
  it("accepts camera and gallery photos", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) assert.equal(photoFileError({ type, size: 1000 }), null);
  });

  it("refuses non-photos, SVG and huge files", () => {
    assert.ok(photoFileError({ type: "application/pdf", size: 1000 }));
    assert.ok(photoFileError({ type: "image/svg+xml", size: 1000 }));
    assert.ok(photoFileError({ type: "image/jpeg", size: MAX_INPUT_BYTES + 1 }));
    assert.ok(photoFileError(null));
  });
});

describe("cropRect", () => {
  it("takes the centred square at zoom 1", () => {
    assert.deepEqual(cropRect({ width: 400, height: 300 }), { sx: 50, sy: 0, size: 300 });
    assert.deepEqual(cropRect({ width: 300, height: 400 }), { sx: 0, sy: 50, size: 300 });
  });

  it("zooms in around the centre and moves with the offset", () => {
    assert.deepEqual(cropRect({ width: 400, height: 400, zoom: 2 }), { sx: 100, sy: 100, size: 200 });
    assert.deepEqual(cropRect({ width: 400, height: 400, zoom: 2, offsetX: 50, offsetY: -50 }), { sx: 150, sy: 50, size: 200 });
  });

  it("never leaves the image, and limits the zoom", () => {
    assert.deepEqual(cropRect({ width: 400, height: 300, offsetX: 999, offsetY: -999 }), { sx: 100, sy: 0, size: 300 });
    assert.equal(cropRect({ width: 300, height: 300, zoom: 10 }).size, 100);
    assert.deepEqual(maxOffsets({ width: 400, height: 300 }), { x: 50, y: 0 });
  });
});
