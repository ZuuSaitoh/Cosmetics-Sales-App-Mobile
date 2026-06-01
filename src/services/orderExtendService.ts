import axiosClient from "../api/axiosClient";

/** POST /orders/{orderId}/details/{detailId}/extend */
export type OrderExtendCreateRequest = {
  extendDays: number;
  paymentMethod: string;
  returnUrl: string;
  payNow: boolean;
};

export type OrderExtendResult = {
  id: number;
  orderDetailId: number;
  oldReturnDate?: string;
  newReturnDate?: string;
  extendDays?: number;
  extendPrice?: number;
  paymentStatus?: string;
  createdAt?: string;
  paymentUrl?: string;
};

export type OrderExtendApiResponse = {
  code: number;
  message?: string;
  result?: OrderExtendResult;
};

/** GET /orders/{orderId}/extends — danh sách gia hạn của đơn */
export type OrderExtendListItem = OrderExtendResult;

export const orderExtendService = {
  /** Tạo yêu cầu gia hạn (JSON body) */
  requestExtend: (orderId: number, detailId: number, data: OrderExtendCreateRequest) =>
    axiosClient.post<OrderExtendApiResponse>(
      `/orders/${orderId}/details/${detailId}/extend`,
      data,
      { headers: { "Content-Type": "application/json" } },
    ),

  /** Thanh toán gia hạn (query: paymentMethod, returnUrl) */
  payExtend: (
    orderId: number,
    detailId: number,
    extendId: number,
    params?: { paymentMethod?: string; returnUrl?: string },
  ) =>
    axiosClient.post<OrderExtendApiResponse>(
      `/orders/${orderId}/details/${detailId}/extend/${extendId}/pay`,
      null,
      { params },
    ),

  /** Lấy danh sách gia hạn theo đơn */
  getOrderExtends: (orderId: number) => axiosClient.get(`/orders/${orderId}/extends`),

  /** Chi tiết một bản ghi gia hạn */
  getExtend: (orderId: number, detailId: number, extendId: number) =>
    axiosClient.get<OrderExtendApiResponse>(
      `/orders/${orderId}/details/${detailId}/extend/${extendId}`,
    ),

  /** Hủy yêu cầu gia hạn */
  cancelExtend: (orderId: number, detailId: number, extendId: number) =>
    axiosClient.delete(`/orders/${orderId}/details/${detailId}/extend/${extendId}`),
};

const normalizeOrderType = (v: unknown) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/-/g, "_");

/** Đơn thuê trang phục “custom” theo API (flag / orderType) */
export const isCustomCostumeOrder = (order: {
  orderType?: unknown;
  isCustom?: boolean;
  customOrder?: boolean;
} | null): boolean => {
  if (!order) return false;
  if (normalizeOrderType(order.orderType) === "RENT_SERVICE") return false;
  if (order.isCustom === true || order.customOrder === true) return true;
  const t = normalizeOrderType(order.orderType);
  if (t.includes("CUSTOM")) return true;
  if (t === "RENT_CUSTOM" || t === "ORDER_CUSTOM") return true;
  return false;
};

const getOrderDetailsArray = (order: Record<string, unknown>): unknown[] => {
  const raw =
    order.details ?? order.orderDetails ?? order.order_details ?? order.items;
  return Array.isArray(raw) ? raw : [];
};

/** Danh sách dòng chi tiết đơn (details / orderDetails / …) */
export const getOrderDetailRows = (order: Record<string, unknown> | null): unknown[] => {
  if (!order) return [];
  return getOrderDetailsArray(order);
};

const hasCostumeOrderDetails = (order: Record<string, unknown> | null): boolean => {
  if (!order) return false;
  const details = getOrderDetailsArray(order);
  if (details.length === 0) return false;
  return details.some((d: unknown) => {
    if (!d || typeof d !== "object") return false;
    const row = d as Record<string, unknown>;
    const cid = row.costumeId ?? row.costume_id;
    return cid != null && cid !== "" && Number(cid) > 0;
  });
};

/** id dòng đơn dùng cho path /details/{detailId}/extend */
export const getOrderDetailRowId = (row: Record<string, unknown>): number | null => {
  const raw = row.id ?? row.orderDetailId ?? row.detailId ?? row.order_detail_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Đơn có thể gia hạn trên màn chi tiết: có ít nhất một dòng thuê trang phục,
 * không phải đơn dịch vụ RENT_SERVICE (kể cả khi backend không gửi orderType “custom”).
 */
export const canShowOrderExtend = (order: Record<string, unknown> | null): boolean => {
  if (!order) return false;
  const normalizedType = normalizeOrderType(order.orderType);
  if (normalizedType === "RENT_SERVICE") return false;
  if (normalizedType === "RENT_COSTUME") return true;
  return hasCostumeOrderDetails(order);
};

export const isOrderStatusInUse = (status: unknown): boolean =>
  String(status ?? "")
    .toUpperCase()
    .replace(/-/g, "_")
    .trim() === "IN_USE";
