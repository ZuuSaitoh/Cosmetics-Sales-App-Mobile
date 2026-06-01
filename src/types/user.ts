export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
}

export interface Address {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
  isDefault: boolean;
}

export interface WishlistItem {
  id: number;
  costume: {
    id: number;
    name: string;
    imageUrls: string[];
    pricePerDay: number;
    status: string;
  };
}
