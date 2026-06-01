export interface Dispute {
  id: number;
  orderId: number;
  reason: string;
  status: string;
  evidenceImages?: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateDisputePayload {
  orderId: number;
  reason: string;
  evidenceImages?: string[];
}
