export type ProvinceItem = {
  code: number;
  name: string;
};

export type WardItem = {
  code: number;
  name: string;
};

export const locationService = {
  getProvinces: async (): Promise<ProvinceItem[]> => {
    const response = await fetch("https://provinces.open-api.vn/api/v2/p");
    return response.json();
  },

  getProvinceDetail: async (
    provinceCode: number,
  ): Promise<{ wards?: WardItem[]; districts?: { wards?: WardItem[] }[] }> => {
    const response = await fetch(
      `https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`,
    );
    return response.json();
  },
};
