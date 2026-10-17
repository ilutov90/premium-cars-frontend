// Shapes returned by the Spring Boot API (see backend CarDtos / InquiryDtos).

export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "PLUGIN_HYBRID" | "ELECTRIC" | "LPG" | "OTHER";
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
  origin: Origin | null;
  status: CarStatus;
  totalPriceEur: number | null;
  coverImageUrl: string | null;
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
  title: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  bodyType: string | null;
  engine: string | null;
  powerHp: number | null;
  color: string | null;
  description: string | null;
  specs: Record<string, string>;
  origin: Origin | null;
  status: CarStatus;
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
  title: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  bodyType: string | null;
  engine: string | null;
  powerHp: number | null;
  color: string | null;
  description: string | null;
  specs: Record<string, string>;
  sourcePrice: number | null;
  sourceCurrency: string | null;
  shippingEur: number | null;
  marginEur: number | null;
  extraDutyRate: number | null;
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
