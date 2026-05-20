import { useState } from "react";
export function usePersonPhotos() {
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const setPhoto = (code: string, url: string | null) => setPhotos(prev => ({ ...prev, [code]: url }));
  return { photos, setPhoto };
}
export const fileToDataUrl = (file: File, size: number): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
};