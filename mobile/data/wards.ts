export const CITIZEN_WARDS = Array.from({ length: 29 }, (_, i) => `Ward ${i + 1}`);

export const NAGARSEVAK_WARDS = CITIZEN_WARDS;

export function getParentWard(subWard: string): string {
  const match = String(subWard || "").match(/\d{1,2}/);
  return match ? `Ward ${Number(match[0])}` : String(subWard || "").trim();
}

export function getSubWards(parentWard: string): string[] {
  return [getParentWard(parentWard)];
}

export function wardMatchesNagarsevak(complaintWard: string, nagarsevakWard: string): boolean {
  const complaintParent = getParentWard(complaintWard).toLowerCase();
  const nagarsevakParent = getParentWard(nagarsevakWard).toLowerCase();
  return complaintParent === nagarsevakParent;
}
