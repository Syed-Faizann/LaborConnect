// frontend/src/lib/axios.js
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api",
  withCredentials: true,
});

let clerkTokenGetter = null;

// Export for App.jsx (resolves the SyntaxError crash)
export const setAxiosAuthToken = (tokenOrGetter) => {
  if (typeof tokenOrGetter === "function") {
    clerkTokenGetter = tokenOrGetter;
  } else if (typeof tokenOrGetter === "string" && tokenOrGetter) {
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${tokenOrGetter}`;
  } else {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
};

// Export for message components
export const setAuthTokenGetter = (getter) => {
  clerkTokenGetter = getter;
};

// Interceptor to ensure token is attached to every request
axiosInstance.interceptors.request.use(
  async (config) => {
    if (!config.headers) {
      config.headers = {};
    }

    if (clerkTokenGetter) {
      try {
        const token = await clerkTokenGetter();
        if (token) {
          if (typeof config.headers.set === "function") {
            config.headers.set("Authorization", `Bearer ${token}`);
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (err) {
        console.error("[Axios Interceptor] Token error:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;