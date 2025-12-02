
import { AppConfig, BeadColor, PatternResult, RGB, PixelData } from '../types';
import { BEAD_PALETTES } from '../constants';

// --- COLOR SPACE CONVERSION UTILS ---

// Convert RGB to XYZ
const rgbToXyz = (r: number, g: number, b: number) => {
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  // D65 Illuminant
  const x = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) * 100;
  const y = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) * 100;
  const z = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) * 100;

  return { x, y, z };
};

// Convert XYZ to Lab
const xyzToLab = (x: number, y: number, z: number) => {
  // D65 reference
  let xN = x / 95.047;
  let yN = y / 100.000;
  let zN = z / 108.883;

  const epsilon = 0.008856;
  const kappa = 903.3;

  xN = xN > epsilon ? Math.pow(xN, 1 / 3) : (kappa * xN + 16) / 116;
  yN = yN > epsilon ? Math.pow(yN, 1 / 3) : (kappa * yN + 16) / 116;
  zN = zN > epsilon ? Math.pow(zN, 1 / 3) : (kappa * zN + 16) / 116;

  const l = Math.max(0, 116 * yN - 16);
  const a = 500 * (xN - yN);
  const b = 200 * (yN - zN);

  return { l, a, b };
};

// Helper to get Lab from RGB directly
const rgbToLab = (rgb: RGB) => {
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
};

// CIE76 Delta E Calculation (Euclidean distance in Lab space)
const getLabDistance = (lab1: { l: number, a: number, b: number }, lab2: { l: number, a: number, b: number }) => {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
};

interface BeadColorWithLab extends BeadColor {
  lab: { l: number, a: number, b: number };
}

// Find the closest bead color in the given palette using Lab distance
const findClosestColorLab = (targetLab: { l: number, a: number, b: number }, palette: BeadColorWithLab[]): BeadColorWithLab => {
  let minDist = Infinity;
  let closest = palette[0];

  for (const color of palette) {
    const dist = getLabDistance(targetLab, color.lab);
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }
  return closest;
};

// Adjust pixel values based on config
const adjustPixel = (r: number, g: number, b: number, config: AppConfig): { r: number, g: number, b: number } => {
  let rN = r / 255;
  let gN = g / 255;
  let bN = b / 255;

  // Contrast
  if (config.contrast !== 1.0) {
    rN = (rN - 0.5) * config.contrast + 0.5;
    gN = (gN - 0.5) * config.contrast + 0.5;
    bN = (bN - 0.5) * config.contrast + 0.5;
  }

  // Saturation
  if (config.saturation !== 1.0) {
    const gray = 0.2989 * rN + 0.5870 * gN + 0.1140 * bN;
    rN = gray + (rN - gray) * config.saturation;
    gN = gray + (gN - gray) * config.saturation;
    bN = gray + (bN - gray) * config.saturation;
  }

  // Brightness
  if (config.brightness !== 0) {
    const brightOffset = config.brightness / 255;
    rN += brightOffset;
    gN += brightOffset;
    bN += brightOffset;
  }

  // Clamp
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  
  return {
    r: clamp(rN) * 255,
    g: clamp(gN) * 255,
    b: clamp(bN) * 255,
  };
};

// Apply simple 3x3 sharpening kernel
const applySharpen = (data: Uint8ClampedArray, width: number, height: number) => {
  const w = width;
  const h = height;
  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ]; 
  
  const copy = new Uint8ClampedArray(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const py = y + ky - 1;
          const px = x + kx - 1;
          
          if (px >= 0 && px < w && py >= 0 && py < h) {
             const kidx = (py * w + px) * 4;
             const weight = kernel[ky * 3 + kx];
             r += copy[kidx] * weight;
             g += copy[kidx + 1] * weight;
             b += copy[kidx + 2] * weight;
          }
        }
      }
      
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx+1] = Math.min(255, Math.max(0, g));
      data[idx+2] = Math.min(255, Math.max(0, b));
    }
  }
};

// Apply 3x3 Median Filter (Denoise)
const applyMedianFilter = (data: Uint8ClampedArray, width: number, height: number) => {
  const copy = new Uint8ClampedArray(data);
  const w = width;
  const h = height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Skip transparency check for filter, but we could respect it. 
      // Median filtering RGB channels.
      const rVals: number[] = [];
      const gVals: number[] = [];
      const bVals: number[] = [];

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const py = y + ky;
          const px = x + kx;
          if (px >= 0 && px < w && py >= 0 && py < h) {
             const kIdx = (py * w + px) * 4;
             // Only include non-transparent neighbors in median to avoid bleeding background color
             if (copy[kIdx + 3] > 128) {
               rVals.push(copy[kIdx]);
               gVals.push(copy[kIdx+1]);
               bVals.push(copy[kIdx+2]);
             }
          }
        }
      }

      if (rVals.length > 0) {
        rVals.sort((a,b) => a-b);
        gVals.sort((a,b) => a-b);
        bVals.sort((a,b) => a-b);

        const mid = Math.floor(rVals.length / 2);
        data[idx] = rVals[mid];
        data[idx+1] = gVals[mid];
        data[idx+2] = bVals[mid];
      }
    }
  }
};

// Flood Fill based Background Removal
// Identifies background starting from corners and sets alpha to 0
const floodFillBackgroundRemoval = (data: Uint8ClampedArray, width: number, height: number, tolerance: number = 30) => {
  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [];

  const getIdx = (x: number, y: number) => (y * width + x) * 4;

  const isSimilar = (idx1: number, idx2: number) => {
      const r1 = data[idx1], g1 = data[idx1+1], b1 = data[idx1+2];
      const r2 = data[idx2], g2 = data[idx2+1], b2 = data[idx2+2];
      // Simple euclidean distance
      return Math.sqrt(Math.pow(r1-r2,2) + Math.pow(g1-g2,2) + Math.pow(b1-b2,2)) < tolerance;
  };

  // Start from corners
  const startPoints = [[0,0], [width-1, 0], [0, height-1], [width-1, height-1]];
  
  startPoints.forEach(([sx, sy]) => {
      const idx = getIdx(sx, sy);
      // Only start if not already transparent/visited
      if (visited[sy * width + sx] === 0 && data[idx+3] > 0) {
          stack.push([sx, sy]);
          visited[sy * width + sx] = 1;
      }
  });

  const baseIdx = getIdx(startPoints[0][0], startPoints[0][1]); // Use Top-Left as reference color base
  
  while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const currIdx = getIdx(x, y);

      // Make transparent
      data[currIdx + 3] = 0; 

      // Check neighbors
      const neighbors = [[x+1, y], [x-1, y], [x, y+1], [x, y-1]];
      for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = getIdx(nx, ny);
              const visitedIdx = ny * width + nx;
              
              if (visited[visitedIdx] === 0) {
                  // Check similarity to current pixel OR base pixel to allow gradients in BG
                  // Here we check against current pixel to chain
                  if (isSimilar(currIdx, nIdx)) {
                      visited[visitedIdx] = 1;
                      stack.push([nx, ny]);
                  }
              }
          }
      }
  }
};


// Quantize a value to group similar colors
const quantize = (val: number, step: number) => {
  if (step <= 1) return val;
  return Math.round(val / step) * step;
};

// Floyd-Steinberg Dithering Kernel
const distributeError = (data: Float32Array, width: number, height: number, x: number, y: number, errR: number, errG: number, errB: number) => {
    const idx = (x: number, y: number) => (y * width + x) * 4;
    
    // Helper to add error
    const addErr = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = idx(nx, ny);
            // Don't diffuse error into transparent pixels (approx alpha check)
            if (data[i + 3] > 10) {
                data[i] += errR * factor;
                data[i + 1] += errG * factor;
                data[i + 2] += errB * factor;
            }
        }
    };

    addErr(1, 0, 7 / 16);
    addErr(-1, 1, 3 / 16);
    addErr(0, 1, 5 / 16);
    addErr(1, 1, 1 / 16);
};

export const generatePattern = async (
  imageSrc: string,
  config: AppConfig
): Promise<PatternResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Safety check: Only set crossOrigin for http/https URLs to allow canvas manipulation
    // Setting it for data: URIs (local uploads/AI) can sometimes cause tainting or loading errors in strict browsers
    if (!imageSrc.startsWith('data:')) {
        img.crossOrigin = 'Anonymous';
    }

    img.onload = () => {
      // 1. Calculate dimensions
      // If image failed to load properly or has 0 dimensions
      if (img.width === 0 || img.height === 0) {
          reject(new Error("Image loaded with 0 dimensions"));
          return;
      }
      
      const aspectRatio = img.height / img.width;
      const targetWidth = Math.floor(config.width);
      const targetHeight = Math.floor(targetWidth * aspectRatio);

      // 2. Set up canvas for processing
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;

      // APPLY BACKGROUND REMOVAL FIRST
      if (config.removeBackground) {
          floodFillBackgroundRemoval(data, targetWidth, targetHeight, 40);
      }

      // APPLY DENOISE (MEDIAN FILTER)
      // This helps create "large color blocks" by removing isolated pixel noise
      if (config.denoise) {
        applyMedianFilter(data, targetWidth, targetHeight);
      }

      // APPLY SHARPENING IF ENABLED
      if (config.enhanceEdges) {
          applySharpen(data, targetWidth, targetHeight);
      }
      
      // PRE-CALCULATE PALETTE LAB VALUES
      const rawPalette = BEAD_PALETTES[config.brand];
      const fullPalette: BeadColorWithLab[] = rawPalette.map(c => ({
          ...c,
          lab: rgbToLab(c.rgb)
      }));

      // Find the "Transparent" bead (H01) for reference
      const transparentBead = fullPalette.find(c => c.id === 'H01') || fullPalette[0];

      // --- PHASE 1: ADAPTIVE PALETTE EXTRACTION ---
      // We only analyze opaque pixels to find the subject's palette
      const sourceColorStats = new Map<string, { count: number, rgb: RGB }>();

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        const a = data[i + 3];

        if (a < 128) continue; // Skip background/transparent

        const adj = adjustPixel(r, g, b, config);
        
        // Quantize colors for statistical analysis
        const precision = config.colorPrecision; 
        const qr = quantize(adj.r, precision);
        const qg = quantize(adj.g, precision);
        const qb = quantize(adj.b, precision);

        const key = `${qr},${qg},${qb}`;
        const existing = sourceColorStats.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          sourceColorStats.set(key, { count: 1, rgb: { r: qr, g: qg, b: qb } });
        }
      }

      // Select top N dominant colors from the SUBJECT only
      const sortedImageColors = Array.from(sourceColorStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, config.maxColors);

      // Create Restricted Palette using Lab distance
      const allowedBeadIds = new Set<string>();
      const restrictedPalette: BeadColorWithLab[] = [];
      
      // Always ensure H01 (Transparent) is available for mapping
      if (transparentBead) {
          allowedBeadIds.add(transparentBead.id);
          restrictedPalette.push(transparentBead);
      }

      sortedImageColors.forEach(item => {
        const itemLab = rgbToLab(item.rgb);
        const matchedBead = findClosestColorLab(itemLab, fullPalette);
        
        if (!allowedBeadIds.has(matchedBead.id) && matchedBead.id !== 'H01') {
            allowedBeadIds.add(matchedBead.id);
            restrictedPalette.push(matchedBead);
        }
      });

      // Fallback
      const activePalette = restrictedPalette.length > 1 ? restrictedPalette : fullPalette;

      // --- PHASE 2: PIXEL MAPPING WITH DITHERING ---
      
      const buffer = new Float32Array(targetWidth * targetHeight * 4);
      
      // Initialize buffer
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const i = (y * targetWidth + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            const adj = adjustPixel(r, g, b, config);
            buffer[i] = adj.r;
            buffer[i + 1] = adj.g;
            buffer[i + 2] = adj.b;
            buffer[i + 3] = a;
        }
      }

      const pixels: PixelData[][] = [];
      const finalColorCounts = new Map<string, { count: number; color: BeadColor }>();
      let totalBeads = 0;

      for (let y = 0; y < targetHeight; y++) {
        const row: PixelData[] = [];
        for (let x = 0; x < targetWidth; x++) {
          const i = (y * targetWidth + x) * 4;
          
          const oldR = buffer[i];
          const oldG = buffer[i + 1];
          const oldB = buffer[i + 2];
          const alpha = buffer[i + 3];
          
          let matchedColor: BeadColorWithLab;

          if (alpha < 128) {
              // Transparent pixel
              matchedColor = transparentBead; 
          } else {
             // Opaque pixel - match to palette
             const pixelLab = rgbToLab({ r: oldR, g: oldG, b: oldB });
             matchedColor = findClosestColorLab(pixelLab, activePalette);
          }
          
          const newR = matchedColor.rgb.r;
          const newG = matchedColor.rgb.g;
          const newB = matchedColor.rgb.b;

          // Stats (Only count non-transparent beads)
          if (matchedColor.id !== 'H01') {
              const stats = finalColorCounts.get(matchedColor.id) || { count: 0, color: matchedColor };
              stats.count++;
              finalColorCounts.set(matchedColor.id, stats);
              totalBeads++;
          }

          row.push({ x, y, color: matchedColor });

          // Apply Dithering only if opaque and not mapping to transparent
          if (config.dithering && alpha >= 128 && matchedColor.id !== 'H01') {
              const errR = oldR - newR;
              const errG = oldG - newG;
              const errB = oldB - newB;

              distributeError(buffer, targetWidth, targetHeight, x, y, errR, errG, errB);
          }
        }
        pixels.push(row);
      }

      resolve({
        pixels,
        width: targetWidth,
        height: targetHeight,
        colorCounts: finalColorCounts,
        totalBeads
      });
    };
    img.onerror = (err) => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
};

/**
 * Analyzes an image to identify which bead colors are present.
 * Used for the "Scan" / "Color ID Recognition" feature.
 */
export const analyzeImageColors = async (
  imageSrc: string,
  brand: string
): Promise<Map<string, { count: number; color: BeadColor; percentage: number }> | PatternResult> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (!imageSrc.startsWith('data:')) {
            img.crossOrigin = 'Anonymous';
        }
        img.onload = () => {
            const MAX_DIM = 500;
            // For pixel art analysis, we want to try to respect the original resolution if it's small (likely a pattern)
            let isSmall = img.width <= 150 && img.height <= 150;
            let w = img.width;
            let h = img.height;

            if (!isSmall && (w > MAX_DIM || h > MAX_DIM)) {
                // If it's a large photo, resize heavily to get general stats/blocky view
                const ratio = w / h;
                if (w > h) {
                    w = 100; // Force small width for readable text overlays
                    h = Math.round(100 / ratio);
                } else {
                    h = 100;
                    w = Math.round(100 * ratio);
                }
            } else if (!isSmall) {
                // Medium image, still scale down for legibility of "Scan" view
                const ratio = w / h;
                if (w > h) {
                    w = 100; 
                    h = Math.round(100 / ratio);
                } else {
                    h = 100;
                    w = Math.round(100 * ratio);
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("No context"));
                return;
            }
            
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            
            const rawPalette = BEAD_PALETTES[brand as keyof typeof BEAD_PALETTES] || BEAD_PALETTES['MARD'];
            // Pre-calculate Lab for performance
            const palette = rawPalette.map(c => ({
                ...c,
                lab: rgbToLab(c.rgb)
            }));
            
            const stats = new Map<string, { count: number; color: BeadColor }>();
            let totalPixels = 0;
            const pixels: PixelData[][] = [];

            for (let y = 0; y < h; y++) {
                const row: PixelData[] = [];
                for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (a < 128) {
                        // Transparent
                         const transparent = rawPalette.find(c => c.id === 'H01') || rawPalette[0];
                         row.push({x, y, color: transparent});
                         continue; 
                    }
                    
                    const lab = rgbToLab({ r, g, b });
                    const match = findClosestColorLab(lab, palette);
                    
                    const entry = stats.get(match.id) || { count: 0, color: match };
                    entry.count++;
                    stats.set(match.id, entry);
                    totalPixels++;
                    
                    row.push({x, y, color: match});
                }
                pixels.push(row);
            }

            // Return full pattern result for visualization
            resolve({
                pixels,
                width: w,
                height: h,
                colorCounts: stats,
                totalBeads: totalPixels
            } as any);
        };
        img.onerror = (e) => reject(e);
        img.src = imageSrc;
    });
};
