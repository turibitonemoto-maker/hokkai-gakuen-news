
import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// Casing fix: PlaceholderImages (lowercase h)
export const PlaceholderImages: ImagePlaceholder[] = data.placeholderImages;

export function getPlaceholderById(id: string): ImagePlaceholder {
  return PlaceholderImages.find(img => img.id === id) || PlaceholderImages[0];
}
