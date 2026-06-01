import axiosClient from "../api/axiosClient";

export const paymentService = {
  topUpVNPay: (data: { userId: number; amount: number; returnUrl: string }) =>
    axiosClient.post("/payment/api/vnpay/create", null, {
      params: { userId: data.userId, amount: data.amount, returnUrl: data.returnUrl },
    }),

  topUpMoMo: (data: { userId: number; amount: number; returnUrl: string }) =>
    axiosClient.post("/payment/api/momo/create", null, {
      params: { userId: data.userId, amount: data.amount, returnUrl: data.returnUrl },
    }),
};