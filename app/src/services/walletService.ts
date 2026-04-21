import axiosClient from "../api/axiosClient";

export const walletService = {
  getByUser: (userId: number) =>
    axiosClient.get(`/wallets/user/${userId}`),

  getTransactions: (userId: number) =>
    axiosClient.get(`/wallets/user/${userId}/transactions`),

  withdraw: (data: { amount: number; bankAccountNumber: string; bankName: string }) =>
    axiosClient.post("/withdraws", data),

  getWithdraws: (userId: number) =>
    axiosClient.get(`/withdraws/${userId}`),
};