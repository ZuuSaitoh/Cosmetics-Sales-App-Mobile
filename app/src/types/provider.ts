export interface Provider {
  id: number;
  userId: number;
  shopName: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  verified: boolean;
  completedOrders: number;
  totalRating: number;
  totalReviews: number;
  bio: string | null;
  role: string;
  bankName?: string;
  bankAccountNumber?: string;
  totalRating5?: number;
}

export interface ProviderUpdatePayload {
  shopName?: string;
  bio?: string;
  bankName?: string;
  bankAccountNumber?: string;
}
