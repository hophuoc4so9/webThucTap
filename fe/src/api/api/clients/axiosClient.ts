import axios from "axios";
import { store } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { API_BASE } from "./apiConfig";

const axiosClient = axios.create({
  baseURL: API_BASE,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
