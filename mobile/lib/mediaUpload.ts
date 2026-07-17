const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function toUploadableMediaUri(uri?: string | null): Promise<string | null> {
  const value = String(uri || "").trim();
  if (!value) return null;
  if (/^(?:https?:|data:)/i.test(value)) return value;

  const response = await fetch(value);
  if (!response.ok) throw new Error("Could not read the selected media file.");
  const blob = await response.blob();
  if (!blob.size || blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Selected media must be smaller than 8MB.");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not prepare the selected media file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}
