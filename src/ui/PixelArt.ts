/**
 * Converts an image to colored block characters for terminal display
 */

export interface PixelArtOptions {
  width: number;        // Number of characters wide
  charAspect?: number;  // Character aspect ratio (height/width), default 2
}

const BLOCK_CHARS = ['█', '▓', '▒', '░', ' '];

export function imageToPixelArt(
  imageUrl: string,
  options: PixelArtOptions
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const { width } = options;

      // Calculate height maintaining true aspect ratio
      const aspectRatio = img.height / img.width;
      const height = Math.round(width * aspectRatio);

      // Create canvas at target resolution
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image scaled down
      ctx.drawImage(img, 0, 0, width, height);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      // Create container element
      const container = document.createElement('pre');
      container.className = 'pixel-art';
      container.style.cssText = `
        font-family: monospace;
        line-height: 0.6;
        letter-spacing: 0;
        font-size: 8px;
        margin: 0;
        padding: 8px 0;
      `;

      // Convert pixels to colored characters - one div per line
      let html = '';

      for (let y = 0; y < height; y++) {
        html += '<div style="white-space:pre">';
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Only filter fully transparent pixels
          if (a < 30) {
            html += '&nbsp;';
          } else {
            html += `<span style="color:rgb(${r},${g},${b})">█</span>`;
          }
        }
        html += '</div>';
      }

      container.innerHTML = html;
      resolve(container);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Composites two images (icon on top, text below) and converts to pixel art
 */
export function compositeToPixelArt(
  iconUrl: string,
  textUrl: string,
  options: PixelArtOptions
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const iconImg = new Image();
    const textImg = new Image();
    iconImg.crossOrigin = 'anonymous';
    textImg.crossOrigin = 'anonymous';

    let iconLoaded = false;
    let textLoaded = false;

    const tryComposite = () => {
      if (!iconLoaded || !textLoaded) return;

      const { width } = options;

      // Calculate dimensions for each image
      const iconAspect = iconImg.height / iconImg.width;
      const textAspect = textImg.height / textImg.width;

      const iconHeight = Math.round(width * iconAspect);
      const textHeight = Math.round(width * textAspect);

      // Text overlaps bottom portion of icon
      const overlap = Math.round(textHeight * 1.6); // 160% overlap
      const totalHeight = iconHeight + textHeight - overlap;

      // Create canvas for composite
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw icon at top
      ctx.drawImage(iconImg, 0, 0, width, iconHeight);
      // Draw text overlapping bottom of icon
      ctx.drawImage(textImg, 0, iconHeight - overlap, width, textHeight);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, width, totalHeight);
      const pixels = imageData.data;

      // Create container element
      const container = document.createElement('pre');
      container.className = 'pixel-art';
      container.style.cssText = `
        font-family: monospace;
        line-height: 0.6;
        letter-spacing: 0;
        font-size: 8px;
        margin: 0;
        padding: 8px 0;
      `;

      // Convert pixels to colored characters
      let html = '';

      for (let y = 0; y < totalHeight; y++) {
        html += '<div style="white-space:pre">';
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Check for transparent or white background
          const isTransparent = a < 30;
          const isWhiteBg = r > 250 && g > 250 && b > 250;

          if (isTransparent || isWhiteBg) {
            html += '&nbsp;';
          } else {
            html += `<span style="color:rgb(${r},${g},${b})">█</span>`;
          }
        }
        html += '</div>';
      }

      container.innerHTML = html;
      resolve(container);
    };

    iconImg.onload = () => {
      iconLoaded = true;
      tryComposite();
    };

    textImg.onload = () => {
      textLoaded = true;
      tryComposite();
    };

    iconImg.onerror = () => reject(new Error('Failed to load icon image'));
    textImg.onerror = () => reject(new Error('Failed to load text image'));

    iconImg.src = iconUrl;
    textImg.src = textUrl;
  });
}

/**
 * Creates a simpler monochrome dithered version
 */
export function imageToMonoPixelArt(
  imageUrl: string,
  options: PixelArtOptions & { color?: string }
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const { width, charAspect = 2, color = '#4af' } = options;

      const aspectRatio = img.height / img.width;
      const height = Math.round((width * aspectRatio) / charAspect);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      const container = document.createElement('pre');
      container.className = 'pixel-art mono';
      container.style.cssText = `
        font-family: monospace;
        line-height: 1;
        letter-spacing: 0;
        font-size: 6px;
        margin: 0;
        padding: 8px 0;
        color: ${color};
        text-shadow: 0 0 4px ${color}40;
      `;

      let text = '';

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a < 30) {
            text += ' ';
          } else {
            // Map brightness to block characters (darker = denser)
            const brightness = (r + g + b) / 3 / 255;

            if (brightness < 0.25) {
              text += '█';
            } else if (brightness < 0.5) {
              text += '▓';
            } else if (brightness < 0.7) {
              text += '▒';
            } else if (brightness < 0.9) {
              text += '░';
            } else {
              text += ' ';
            }
          }
        }
        text += '\n';
      }

      container.textContent = text;
      resolve(container);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}
