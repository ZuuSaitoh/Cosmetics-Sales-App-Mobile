export interface Booking {
  id: number;
  cosplayerId: number;
  providerId: number;
  serviceId: number;
  status: string;
  totalAmount: number;
  depositAmount: number;
  bookingDate: string;
  numberOfSlots: number;
  service?: Service;
}

export interface Service {
  id: number;
  serviceName: string;
  serviceType: string;
  description: string;
  pricePerSlot: number;
  slotDurationHours: number;
  depositAmount: number;
  minPrice?: number;
  maxPrice?: number;
  imageUrls: string[];
  areas?: string[];
}

export interface CreateBookingPayload {
  serviceId: number;
  bookingDate: string;
  numberOfSlots: number;
  paymentMethod: string;
  cosplayerAddressId: number;
}
