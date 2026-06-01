export interface Review {
  id: number;
  cosplayerId: number;
  orderId: number;
  rating: number;
  comment: string;
  images?: ReviewImage[];
  user?: {
    id: number;
    fullName: string;
    avatarUrl?: string;
  };
  userName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface ReviewImage {
  id?: number;
  url?: string;
}

export interface SubmitReviewPayload {
  cosplayerId: number;
  orderId: number;
  rating: number;
  comment: string;
  files?: { uri: string; name: string; type: string }[];
}
