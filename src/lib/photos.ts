import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { api } from "./api";
import type { PhotoRef } from "./types";

export const MAX_PHOTOS = 3;
const MAX_SIDE = 1600;

/** A photo picked on the device, already converted to JPEG (the server can't decode every HEIC). */
export type LocalPhoto = { key: string; uri: string; base64: string };

async function toJpeg(asset: ImagePicker.ImagePickerAsset): Promise<LocalPhoto> {
  const longest = Math.max(asset.width || 0, asset.height || 0);
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (longest > MAX_SIDE) {
    if ((asset.width || 0) >= (asset.height || 0)) ctx.resize({ width: MAX_SIDE });
    else ctx.resize({ height: MAX_SIDE });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uri: out.uri, base64: out.base64 ?? "" };
}

/** Opens the photo library (no camera). Returns [] when cancelled. */
export async function pickPhotos(limit: number): Promise<LocalPhoto[]> {
  if (limit <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (res.canceled) return [];
  const out: LocalPhoto[] = [];
  for (const a of res.assets.slice(0, limit)) out.push(await toJpeg(a));
  return out;
}

export function uploadPhoto(p: LocalPhoto, token?: string | null) {
  return api<{ ok: true; photos: PhotoRef[] }>("/api/me/photo", {
    method: "POST",
    body: { image: `data:image/jpeg;base64,${p.base64}` },
    ...(token !== undefined ? { token } : {}),
  });
}

export const deletePhoto = (photoId: string) => api<{ ok: true; photos: PhotoRef[] }>("/api/me/photo", { method: "DELETE", body: { photoId } });

/** https://…/api/photos/<id> -> <id> */
export const photoIdFromUrl = (url: string) => url.split("/").pop() ?? "";
