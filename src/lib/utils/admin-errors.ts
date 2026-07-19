export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err.response?.data?.message || err.message || fallback;
}

export function formatAdminDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
}
