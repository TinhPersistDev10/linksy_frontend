/**
 * Cloudinary URL helpers for sharper lightbox viewing.
 * Chat bubbles can keep the original CDN URL; the viewer requests a larger, higher-quality derivative.
 */

function splitCloudinaryUpload(url: string): { prefix: string; rest: string } | null {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return {
    prefix: url.slice(0, index + marker.length),
    rest: url.slice(index + marker.length),
  };
}

/** Strip existing transformation segment so we can apply a fresh one. */
function stripTransforms(rest: string): string {
  // "q_auto:good,f_auto/v123/path" or "c_fill,w_200/folder/file"
  // Transforms are comma-separated and appear before the public id / version.
  const segments = rest.split("/");
  if (segments.length === 0) return rest;

  const first = segments[0] ?? "";
  const looksLikeTransform =
    first.includes(",") ||
    /^(?:[a-z]_)/i.test(first) ||
    first.startsWith("q_auto") ||
    first.startsWith("f_auto");

  if (!looksLikeTransform) return rest;
  return segments.slice(1).join("/");
}

/** High-res URL for fullscreen / lightbox (reduces blur vs CSS-scaling a small asset). */
export function getFullQualityImageUrl(url: string, maxWidth = 2560): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  const parts = splitCloudinaryUpload(url);
  if (!parts) return url;

  const path = stripTransforms(parts.rest);
  return `${parts.prefix}c_limit,w_${maxWidth},q_auto:best,dpr_auto,f_auto/${path}`;
}

/** Smaller derivative for gallery thumbnails. */
export function getThumbnailImageUrl(url: string, size = 96): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  const parts = splitCloudinaryUpload(url);
  if (!parts) return url;

  const path = stripTransforms(parts.rest);
  return `${parts.prefix}c_fill,w_${size},h_${size},q_auto:eco,f_auto/${path}`;
}

/**
 * Fullscreen avatar URL.
 * - Default text avatars are generated at ~200px → rewrite to a larger canvas.
 * - Uploaded photos → request best-quality delivery (and larger if original allows).
 */
export function getFullQualityAvatarUrl(url: string, size = 1024): string {
  if (!url) return url;
  if (!url.includes("res.cloudinary.com")) return url;

  // Generated initials avatar: .../w_200,h_200,.../l_text:Roboto_80_bold:XX/...
  if (url.includes("l_text:")) {
    const baseSize = 200;
    const scaledFont = (fontSize: number) =>
      Math.max(80, Math.round((fontSize * size) / baseSize));

    return url
      .replace(/\bw_\d+\b/g, `w_${size}`)
      .replace(/\bh_\d+\b/g, `h_${size}`)
      .replace(/Roboto_(\d+)_bold/g, (_, fontSize: string) => {
        return `Roboto_${scaledFont(Number(fontSize))}_bold`;
      });
  }

  // Uploaded avatar delivery often includes w_400,h_400,c_fill — strip and re-request sharp.
  return getFullQualityImageUrl(url, size);
}
