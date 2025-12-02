
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface BeadColor {
  id: string; // e.g., "P01", "H17"
  name: string; // e.g., "Black", "Cream"
  hex: string;
  rgb: RGB;
}

export type BeadBrand = 'MARD' | 'COCO' | 'MANMAN' | 'PANPAN' | 'MIDORI' | 'MEOW';

export interface AppConfig {
  width: number; // Width in beads (e.g. 30 to 100)
  contrast: number; // 0.5 to 1.5
  saturation: number; // 0.5 to 1.5
  brightness: number; // -50 to 50
  brand: BeadBrand;
  showGrid: boolean;
  enhanceEdges: boolean;
  maxColors: number; // Limit the number of distinct colors used
  colorPrecision: number; // 1 (Exact) to 50 (Low/Posterized)
  dithering: boolean;
  removeBackground: boolean; // Auto remove background
  denoise: boolean; // Smooth/Median filter to create large blocks
}

export interface PixelData {
  x: number;
  y: number;
  color: BeadColor;
}

export interface PatternResult {
  pixels: PixelData[][]; // 2D array of beads
  width: number;
  height: number;
  colorCounts: Map<string, { count: number; color: BeadColor }>;
  totalBeads: number;
}

// User Management Types
export interface UserData {
  id: string;
  username: string;
  password?: string; // In real app, this would be hashed. Here plain for demo logic.
  role: 'admin' | 'user';
  level: 'VIP' | 'Normal';
  joinDate: string;
  avatarColor: string;
  status: 'Active' | 'Banned';
}
