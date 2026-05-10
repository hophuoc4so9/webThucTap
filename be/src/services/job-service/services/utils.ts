export const normalizeString = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .trim();
};
