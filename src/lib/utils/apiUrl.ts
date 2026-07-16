export function getApiOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return "";

  return apiUrl.replace(/\/api(?:\/v\d+)?\/?$/, "");
}
