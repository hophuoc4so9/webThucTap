import axiosClient from "../clients/axiosClient";

export const pingGateway = async () => {
  return axiosClient.get("/gateway/ping");
};

export const pingAuthService = async () => {
  return axiosClient.get("/auth/health");
};

export const pingAuthServiceViaRMQ = async () => {
  return axiosClient.get("/auth/ping-service");
};

export const loginApi = async (data: { email: string; password: string }) => {
  return axiosClient.post("/auth/login", data);
};

export const registerApi = async (data: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}) => {
  return axiosClient.post("/auth/register", data);
};
