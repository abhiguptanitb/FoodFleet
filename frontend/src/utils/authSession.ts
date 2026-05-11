import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "token";

type AuthSession = {
  token: string;
  user: unknown;
};

let authServiceUrl = "";
let refreshRequest: Promise<AuthSession | null> | null = null;

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || "";

export const setAccessToken = (token: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const refreshAccessToken = async () => {
  if (!authServiceUrl) return null;

  if (!refreshRequest) {
    refreshRequest = axios
      .post<AuthSession>(
        `${authServiceUrl}/api/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        setAccessToken(data.token);
        return data;
      })
      .catch(() => {
        clearAccessToken();
        return null;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

export const logoutSession = async () => {
  clearAccessToken();

  if (!authServiceUrl) return;

  try {
    await axios.post(
      `${authServiceUrl}/api/auth/logout`,
      {},
      { withCredentials: true }
    );
  } catch (error) {
  }
};

export const configureAuthSession = (authService: string) => {
  authServiceUrl = authService;

  axios.interceptors.request.use((config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      const isSessionEndpoint =
        originalRequest?.url?.includes("/api/auth/login") ||
        originalRequest?.url?.includes("/api/auth/refresh") ||
        originalRequest?.url?.includes("/api/auth/logout");

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        isSessionEndpoint
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const session = await refreshAccessToken();

      if (!session?.token) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${session.token}`;
      return axios(originalRequest);
    }
  );
};
