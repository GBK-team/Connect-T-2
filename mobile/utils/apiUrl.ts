import { apiUrl } from "@/constants/api";

export function getApiUrl(path: string): string {
  return apiUrl(path);
}
