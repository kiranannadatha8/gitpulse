import axios from "axios";
import type { Review } from "../types/review";
import type { User } from "../types/user";

// In dev, Vite proxies /api → localhost:3001 (see vite.config.ts).
// In production, VITE_API_URL points to the deployed backend (e.g. Render).
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const client = axios.create({ baseURL: BASE_URL, withCredentials: true });

export async function submitReview(prUrl: string): Promise<Review> {
  const response = await client.post<Review>("/reviews", { prUrl });
  return response.data;
}

export async function fetchHistory(): Promise<Review[]> {
  const response = await client.get<Review[]>("/reviews");
  return response.data;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await client.get<User | null>("/auth/me");
  return response.data;
}

export async function logoutUser(): Promise<void> {
  await client.post("/auth/logout");
}

export function getGitHubLoginUrl(): string {
  return "/api/auth/github";
}

export async function exportAccountData(): Promise<Blob> {
  const response = await client.get("/auth/account/data", {
    responseType: "json",
  });
  return new Blob([JSON.stringify(response.data, null, 2)], {
    type: "application/json",
  });
}

export async function deleteAccount(): Promise<void> {
  await client.delete("/auth/account");
}
