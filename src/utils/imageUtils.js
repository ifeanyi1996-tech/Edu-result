// ─── Image Utilities ──────────────────────────────────────────────────────────
// Firestore has a 1 MB document limit, so we must compress logos before saving.

/**
 * Compress an image File to a base64 JPEG string.
 * @param {File} file  - The image file from an <input type="file">
 * @param {number} maxDim - Max width OR height in pixels (default 400)
 * @param {number} quality - JPEG quality 0–1 (default 0.7)
 * @returns {Promise<string>} base64 data URL
 */
export function compressImage(file, maxDim = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}
