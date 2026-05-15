/**
 * Centralized API configuration
 * Contains API base URL and initialization logic
 */

// API Base URL với logic lấy từ env variable hoặc default
export const API_BASE = (
  import.meta.env.VITE_API_URL as string | undefined ?? "http://localhost:8082"
).replace(/\/$/, "");

// URL uploads
export const UPLOADS_URL = `${API_BASE}/uploads`;

// Hàm get file URL từ filePath
export const getCvFileUrl = (filePath: string | undefined): string | null =>
  filePath ? `${UPLOADS_URL}/${filePath.replace(/^.*[/\\]/, "")}` : null;
