export interface ApplianceCatalogItem {
  id: string;
  name: string;
  watt: number;
  hoursPerDay: number;
  reduceRatio: number;
}

export const APPLIANCES: ApplianceCatalogItem[] = [
  { id: "aircon", name: "에어컨", watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 },
  { id: "fridge", name: "냉장고", watt: 150, hoursPerDay: 24, reduceRatio: 0.1 },
  { id: "washer", name: "세탁기", watt: 500, hoursPerDay: 1, reduceRatio: 0.2 },
  { id: "tv", name: "TV", watt: 120, hoursPerDay: 4, reduceRatio: 0.2 },
  { id: "pc", name: "컴퓨터", watt: 250, hoursPerDay: 5, reduceRatio: 0.2 },
  { id: "rice-cooker", name: "전기밥솥", watt: 900, hoursPerDay: 2, reduceRatio: 0.1 },
  { id: "dryer", name: "건조기", watt: 2500, hoursPerDay: 1, reduceRatio: 0.3 },
  { id: "heater", name: "전기히터", watt: 1200, hoursPerDay: 3, reduceRatio: 0.5 },
];
