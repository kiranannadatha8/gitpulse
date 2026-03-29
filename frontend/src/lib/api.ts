import axios from "axios";
import type { Review } from "../types/review";

const client = axios.create({ baseURL: "/api", withCredentials: true });

export async function submitReview(prUrl: string): Promise<Review> {
  const response = await client.post<Review>("/reviews", { prUrl });
  return response.data;
}

export async function fetchHistory(): Promise<Review[]> {
  const response = await client.get<Review[]>("/reviews");
  return response.data;
}
