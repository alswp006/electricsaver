import type { Appliance } from "@/lib/types";

export const APPLIANCES: Appliance[] = [
  { id: "aircon", name: "에어컨", watt: 1800, defaultHours: 8, icon: "❄️" },
  { id: "dryer", name: "건조기", watt: 1600, defaultHours: 1, icon: "🌀" },
  { id: "microwave", name: "전자레인지", watt: 1000, defaultHours: 0.5, icon: "🍽️" },
  { id: "washer", name: "세탁기", watt: 500, defaultHours: 1, icon: "🧺" },
  { id: "heatmat", name: "전기장판", watt: 300, defaultHours: 8, icon: "🛏️" },
  { id: "dehumid", name: "제습기", watt: 300, defaultHours: 4, icon: "💧" },
  { id: "tv", name: "TV", watt: 150, defaultHours: 4, icon: "📺" },
  { id: "ricecooker", name: "전기밥솥(보온)", watt: 100, defaultHours: 12, icon: "🍚" },
];
