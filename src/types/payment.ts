export interface Wallet {
  id: number;
  userId: number;
  balance: number;
  depositBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  walletId: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface TopUpPayload {
  userId: number;
  amount: number;
  paymentMethod: "VNPAY" | "MOMO";
  returnUrl: string;
}

export interface RepayPayload {
  orderId: number;
  cosplayerId: number;
  paymentMethod: string;
  returnUrl: string;
}
