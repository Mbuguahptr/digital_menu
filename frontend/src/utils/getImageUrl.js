// src/utils/getImageUrl.js
export default function getImageUrl(imagePath) {
  const fallback = "http://127.0.0.1:8000/media/hotels/default-image.jpg";

  if (!imagePath) return fallback;

  // Already a full URL
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Remove leading slash to avoid double slashes
  const cleanedPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;

  // Ensure /media/ is included
  const path = cleanedPath.startsWith("media/") ? `/${cleanedPath}` : `/media/${cleanedPath}`;

  return `http://127.0.0.1:8000${path}`;
}
