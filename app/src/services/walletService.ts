import axiosClient from "../api/axiosClient";

export const walletService = {
  getByUser: (userId: number) =>
    axiosClient.get(`/wallets/user/${userId}`),

  getTransactions: (userId: number) =>
    axiosClient.get(`/wallets/user/${userId}/transactions`),
};