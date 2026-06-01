import axiosClient from "../api/axiosClient";

export const userService = {
  getProfile: (userId: number) =>
    axiosClient.get(`/users/${userId}/profile`),

  updateProfile: (userId: number, data: { fullName: string; phone?: string }) =>
    axiosClient.put(`/users/${userId}/profile`, data),

  updateAvatar: (userId: number, formData: FormData) =>
    axiosClient.put(`/users/${userId}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getAddresses: (userId: number) =>
    axiosClient.get(`/users/${userId}/addresses`),

  addAddress: (userId: number, data: Record<string, unknown>) =>
    axiosClient.post(`/users/${userId}/addresses`, data),

  deleteAddress: (userId: number, addressId: number) =>
    axiosClient.delete(`/users/${userId}/addresses/${addressId}`),

  getWishlist: (userId: number) =>
    axiosClient.get(`/users/${userId}/wishlist`),

  addToWishlist: (userId: number, costumeId: number) =>
    axiosClient.post(`/users/${userId}/wishlist`, { costumeId }),

  removeFromWishlist: (userId: number, wishlistId: number) =>
    axiosClient.delete(`/users/${userId}/wishlist/${wishlistId}`),

  searchUsers: (keyword: string) =>
    axiosClient.get("/users/search", { params: { keyword } }),

  getBankList: () =>
    axiosClient.get("https://api.vietqr.io/v2/banks"),
};