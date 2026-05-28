import { v } from "convex/values";

export const garageVehicleTypeValidator = v.union(
  v.literal("bike"),
  v.literal("scooter"),
  v.literal("car"),
  v.literal("electric_bike"),
  v.literal("electric_car"),
  v.literal("bicycle"),
);

export const garageServiceTypeValidator = v.union(
  v.literal("free_service"),
  v.literal("paid_service"),
  v.literal("breakdown_repair"),
  v.literal("accident_repair"),
  v.literal("warranty_claim"),
  v.literal("custom"),
);

export const garageExpenseTypeValidator = v.union(
  v.literal("fuel"),
  v.literal("insurance"),
  v.literal("toll"),
  v.literal("parking"),
  v.literal("accessory"),
  v.literal("modification"),
  v.literal("fine"),
  v.literal("washing"),
  v.literal("ev_charging"),
  v.literal("other"),
);

export const garageDocumentTypeValidator = v.union(
  v.literal("rc"),              // Registration Certificate
  v.literal("insurance_policy"),
  v.literal("puc"),             // Pollution Under Control
  v.literal("service_bill"),
  v.literal("warranty_card"),
  v.literal("other"),
);
