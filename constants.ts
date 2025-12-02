
import { BeadBrand, BeadColor } from './types';

// Helper to convert Hex to RGB
const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const createColor = (id: string, name: string, hex: string): BeadColor => ({
  id,
  name,
  hex,
  rgb: hexToRgb(hex),
});

// Helper to interpolate colors for the series
const interpolateColors = (prefix: string, seriesName: string, startHex: string, endHex: string, count: number): BeadColor[] => {
  const colors: BeadColor[] = [];
  
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);
    
    // Convert back to hex
    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    const id = `${prefix}${i + 1}`;
    colors.push(createColor(id, seriesName, hex));
  }
  return colors;
};

// --- MARD PALETTE DEFINITION ---
// Updated to match the specific color card provided
// A: Yellows (1-26)
// C: Blues (1-30 estimated)
// E: Skin (1-25)
// G: Browns (1-21)
// M: Dark/Greens/Shadows (1-15)
// R: Translucent/Jelly
// B: Greens (1-29)
// D: Purples (1-20)
// F: Reds/Pinks (1-16)
// H: Greys (H1 Trans, H2 White, H7 Black)

// Note: Colors are approximations based on standard Perler/Artkal equivalents for these MARD IDs
const MARD_COLORS: BeadColor[] = [
  ...interpolateColors('A', '黄色系', '#FFFDE7', '#F57F17', 26),
  ...interpolateColors('B', '绿色系', '#DCEDC8', '#1B5E20', 29),
  ...interpolateColors('C', '蓝色系', '#E1F5FE', '#0D47A1', 30),
  ...interpolateColors('D', '紫色系', '#F3E5F5', '#4A148C', 20),
  ...interpolateColors('E', '肤色系', '#FFF3E0', '#D84315', 25), 
  // Adjusted Red end-point to be less brown
  ...interpolateColors('F', '红色系', '#FFEBEE', '#D32F2F', 16), 
  // Adjusted Brown end-point to be distinct from Red (Desaturated/Darker)
  ...interpolateColors('G', '棕色系', '#D7CCC8', '#3E2723', 21), 
  ...interpolateColors('M', '暗色系', '#90A4AE', '#263238', 15),
];

// Special H Series (Greyscale + Black/White)
// H1: Transparent (represented as very light grey/white for visibility)
// H2: White
// H7: Black
const H_SERIES: BeadColor[] = [];
const hTotal = 32; 

for (let i = 1; i <= hTotal; i++) {
    const id = `H${i < 10 ? '0' + i : i}`;
    let hex = '#808080';
    let name = '灰色系';

    if (i === 1) { 
        hex = '#F5F5F5'; name = '透明 (H01)'; // Visual representation
    } else if (i === 2) { 
        hex = '#FFFFFF'; name = '白色 (H02)'; 
    } else if (i === 7) { 
        hex = '#0E0E0E'; name = '黑色 (H07)'; // Not pure black to distinguish from outlines
    } else {
        // Generate greys
        // Distribute greys between white and black excluding the specific slots
        // This is a rough approximation to fill the H series
        const val = Math.floor(255 - (i * (255/hTotal)));
        const h = val.toString(16).padStart(2, '0');
        hex = `#${h}${h}${h}`;
    }
    
    // Override common specific H codes if known to be standard
    if (i === 3) hex = '#E0E0E0';
    if (i === 17) hex = '#BDBDBD'; // Grey
    if (i === 18) hex = '#424242'; // Dark Grey

    H_SERIES.push(createColor(id, name, hex));
}

// Combine all
const FINAL_MARD_COLORS = [...MARD_COLORS, ...H_SERIES];

// --- COCO PALETTE ---
// COCO maps to MARD but with different IDs in the chart. 
// For simplicity in this version, we map them 1:1 with modified IDs until a full mapping table is transcribed.
const COCO_COLORS = FINAL_MARD_COLORS.map(c => ({
  ...c,
  id: 'C-' + c.id, 
  name: c.name.replace('系', '系列')
}));

const GENERIC_COLORS = FINAL_MARD_COLORS.map(c => ({ ...c }));

export const BEAD_PALETTES: Record<BeadBrand, BeadColor[]> = {
  MARD: FINAL_MARD_COLORS,
  COCO: COCO_COLORS,
  MANMAN: GENERIC_COLORS,
  PANPAN: GENERIC_COLORS,
  MIDORI: GENERIC_COLORS,
  MEOW: GENERIC_COLORS,
};
