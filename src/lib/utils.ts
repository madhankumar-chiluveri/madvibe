import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function sanitizeForConvex(data: any): string {
    return JSON.stringify(data);
}

export const ACCENT_COLORS = [
    { value: "violet", hsl: "262.1 83.3% 57.8%", name: "Violet" },
    { value: "indigo", hsl: "231.4 48.0% 48.0%", name: "Indigo" },
    { value: "rose", hsl: "346.8 77.2% 49.8%", name: "Rose" },
    { value: "amber", hsl: "45.4 93.4% 47.5%", name: "Amber" },
    { value: "emerald", hsl: "160.1 84.1% 39.4%", name: "Emerald" },
    { value: "sky", hsl: "204.1 94.1% 43.9%", name: "Sky" },
];

export function formatRelativeTime(date: Date | number): string {
    return formatDistanceToNow(date, { addSuffix: true });
}