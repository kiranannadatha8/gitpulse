import axios from "axios";
import type { Review } from "../types/review";
import type { User } from "../types/user";

const client = axios.create({ baseURL: "/api", withCredentials: true });

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
