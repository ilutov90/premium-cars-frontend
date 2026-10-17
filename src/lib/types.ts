// Shapes returned by the Spring Boot API (see backend CarDtos / InquiryDtos).

export type FuelType =
  | "PETROL"
  | "DIESEL"
  | "HYBRID"
  | "PLUGIN_HYBRID"
  | "RANGE_EXTENDER"
  | "ELECTRIC"
  | "LPG"
  | "OTHER";
export type Drivetrain = "FWD" | "RWD" | "AWD";
export type Transmission = "AUTOMATIC" | "MANUAL";
export type Origin = "KR" | "CN";
export type CarStatus = "DRAFT" | "PUBLISHED" | "RESERVED" | "SOLD" | "ARCHIVED";
export type CarSource = "AUTOHOME" | "AUTOWINI" | "OTHER" | "MANUAL";

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface CarSummary {
  id: number;
  slug: string;
  title: string;
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  powerHp: number | null;
  batteryKwh: number | null;
  electricRangeKm: number | null;
  origin: Origin | null;
  status: CarStatus;
  totalPriceEur: number | null;
  coverImageUrl: string | null;
}

/** Public description of a car (backend CarSpecs). */
export interface CarSpecs {
  title: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  /** "YYYY-MM" when known */
  firstRegistration: string | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  drivetrain: Drivetrain | null;
  engineCc: number | null;
  engine: string | null;
  powerHp: number | null;
  batteryKwh: number | null;
  electricRangeKm: number | null;
  /** CLTC, NEDC, WLTP, EPA ... */
  rangeStandard: string | null;
  motorPowerKw: number | null;
  bodyType: string | null;
  seats: number | null;
  doors: number | null;
  color: string | null;
  curbWeightKg: number | null;
  dimensions: string | null;
  description: string | null;
  extraSpecs: Record<string, string>;
}

/** Admin-only price inputs (backend PricingInputs). */
export interface PricingInputs {
  sourcePrice: number | null;
  sourceCurrency: string | null;
  shippingEur: number | null;
  marginEur: number | null;
  /** fraction, e.g. 0.17 */
  extraDutyRate: number | null;
}

export interface PublicPrice {
  carPriceEur: number;
  shippingEur: number;
  customsDutyEur: number;
  vatEur: number;
  serviceEur: number;
  totalEur: number;
}

export interface CarDetail {
  id: number;
  slug: string;
  status: CarStatus;
  origin: Origin | null;
  specs: CarSpecs;
  imageUrls: string[];
  price: PublicPrice | null;
}

export interface FilterOptions {
  makes: string[];
  fuelTypes: FuelType[];
  transmissions: Transmission[];
  origins: Origin[];
}

export interface PriceBreakdown {
  sourcePrice: number;
  sourceCurrency: string;
  carPriceEur: number;
  shippingEur: number;
  customsDutyRate: number;
  customsDutyEur: number;
  vatRate: number;
  vatEur: number;
  feesEur: number;
  marginEur: number;
  totalEur: number;
}

export interface AdminImage {
  id: number;
  url: string;
  sourceUrl: string | null;
  position: number;
}

export interface AdminCar {
  id: number;
  slug: string;
  status: CarStatus;
  source: CarSource;
  sourceUrl: string | null;
  sourceRef: string | null;
  sourceLocation: string | null;
  specs: CarSpecs;
  pricing: PricingInputs;
  price: PriceBreakdown | null;
  images: AdminImage[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ImportResult {
  car: AdminCar;
  alreadyImported: boolean;
  importedImages: number;
  warnings: string[];
}

export type InquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

export interface AdminInquiry {
  id: number;
  carId: number | null;
  carTitle: string | null;
  carSlug: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
}
