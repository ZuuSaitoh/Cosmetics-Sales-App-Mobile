export interface Costume {
  id: number;
  name: string;
  description: string;
  pricePerDay: number;
  depositAmount: number;
  status: string;
  providerId: number;
  imageUrls: string[];
  category?: string;
  rentalOptions?: RentalOption[];
  accessories?: Accessory[];
  surcharges?: Surcharge[];
}

export interface RentalOption {
  id: number;
  name: string;
  price: number;
  description?: string;
}

export interface Accessory {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface Surcharge {
  id: number;
  name: string;
  price: number;
}

export interface CostumeSearchParams {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  providerId?: number;
}

export interface CreateCostumePayload {
  name: string;
  description: string;
  pricePerDay: number;
  depositAmount: number;
  category: string;
  imageUrls: string[];
  rentalOptions?: { name: string; price: number }[];
  accessories?: { name: string; price: number }[];
  surcharges?: { name: string; price: number }[];
}
