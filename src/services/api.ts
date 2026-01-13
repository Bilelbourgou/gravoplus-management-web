import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - logout user
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }

        const message = error.response?.data?.error || error.message || 'An error occurred';
        return Promise.reject(new Error(message));
    }
);

export default api;
