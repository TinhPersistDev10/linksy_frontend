const OUTLINE_DIRECTIONS: Array<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

function toWhiteSilhouette(imageData: ImageData): ImageData {
  const silhouette = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );
  for (let i = 0; i < silhouette.data.length; i += 4) {
    const alpha = silhouette.data[i + 3];
    silhouette.data[i] = 255;
    silhouette.data[i + 1] = 255;
    silhouette.data[i + 2] = 255;
    silhouette.data[i + 3] = alpha > 10 ? 255 : 0;
  }
  return silhouette;
}

/**
 * Vẽ viền trắng kiểu sticker (Messenger/TikTok) quanh 1 ảnh đã tách nền:
 * tạo silhouette trắng từ alpha mask, dập nó lệch 8 hướng phía sau, rồi
 * chồng ảnh gốc lên trên.
 */
export async function applyStickerOutline(
  blob: Blob,
  outlineWidth = 8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = bitmap.width;
  sourceCanvas.height = bitmap.height;
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) throw new Error("Canvas 2D không khả dụng");
  sourceCtx.drawImage(bitmap, 0, 0);

  const silhouetteData = toWhiteSilhouette(
    sourceCtx.getImageData(0, 0, bitmap.width, bitmap.height),
  );
  const silhouetteCanvas = document.createElement("canvas");
  silhouetteCanvas.width = bitmap.width;
  silhouetteCanvas.height = bitmap.height;
  const silhouetteCtx = silhouetteCanvas.getContext("2d");
  if (!silhouetteCtx) throw new Error("Canvas 2D không khả dụng");
  silhouetteCtx.putImageData(silhouetteData, 0, 0);

  const padding = outlineWidth;
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = bitmap.width + padding * 2;
  outputCanvas.height = bitmap.height + padding * 2;
  const ctx = outputCanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D không khả dụng");

  for (const [dx, dy] of OUTLINE_DIRECTIONS) {
    ctx.drawImage(
      silhouetteCanvas,
      padding + dx * outlineWidth,
      padding + dy * outlineWidth,
    );
  }

  ctx.drawImage(bitmap, padding, padding);

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Không thể tạo ảnh sticker"));
    }, "image/png");
  });
}
