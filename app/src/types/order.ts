export interface Order {
  id: number;
  cosplayerId: number;
  costumeId: number;
  status: string;
  rentDay: number;
  rentStart: string;
  totalAmount: number;
  depositAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  details?: OrderDetail[];
  costume?: {
    id: number;
    name: string;
    imageUrls: string[];
    pricePerDay: number;
  };
}

export interface OrderDetail {
  id: number;
  costumeId: number;
  quantity: number;
  pricePerDay: number;
  rentalOptionId?: number;
  accessoryIds?: number[];
}

export interface CreateOrderPayload {
  costumeId: number;
  rentDay: number;
  rentStart: string;
  paymentMethod: string;
  returnUrl: string;
  cosplayerAddressId: number;
  selectedAccessoryIds: number[];
  selectedRentalOptionId?: number | null;
}

export interface OrderTracking {
  id: number;
  orderId: number;
  status: string;
  note?: string;
  createdAt: string;
}
