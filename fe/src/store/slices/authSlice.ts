import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id: string;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN";
  name?: string | null;
  recruiterStatus?: "none" | "pending" | "approved" | "rejected";
  companyName?: string | null;
  companyWebsite?: string | null;
  companyId?: number | null;
  position?: string | null;
  location?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const restoreAuth = (): AuthState => {
  try {
    const token = localStorage.getItem("access_token");
    const userRaw = localStorage.getItem("auth_user");
    if (!token || !userRaw)
      return { user: null, token: null, isAuthenticated: false };
    const user: User = JSON.parse(userRaw);
    return { user, token, isAuthenticated: true };
  } catch {
    return { user: null, token: null, isAuthenticated: false };
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: restoreAuth(),
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem("access_token", action.payload.token);
      localStorage.setItem("auth_user", JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_user");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
