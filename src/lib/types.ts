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

/** A row of the admin car list (backend AdminCarSummary): where the car was imported from, too. */
export interface AdminCarSummary {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  mileageKm: number | null;
  status: CarStatus;
  totalPriceEur: number | null;
  coverImageUrl: string | null;
  source: CarSource;
  sourceRef: string | null;
  sourceUrl: string | null;
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

/** Price formula of a source site (backend PriceProfile). */
export type PriceProfile = "AUTOHOME" | "AUTOWINI";

/** Admin-only price inputs (backend PricingInputs). */
export interface PricingInputs {
  sourcePrice: number | null;
  sourceCurrency: string | null;
  /** null = the formula of the car's source site */
  profile: PriceProfile | null;
  /** profit for this car instead of the formula's; null = the formula's */
  profitEur: number | null;
  /** final price set by hand, replacing the calculation; null = calculated */
  fixedTotalEur: number | null;
}

/** final price = car + baseCosts + stepCost × (car − threshold) / step + profit, all EUR; proportional above the threshold. */
export interface PricingProfile {
  id: PriceProfile;
  baseCosts: number;
  threshold: number;
  step: number;
  stepCost: number;
  profit: number;
  updatedAt: string;
}

export interface CarDetail {
  id: number;
  slug: string;
  status: CarStatus;
  origin: Origin | null;
  specs: CarSpecs;
  imageUrls: string[];
  /** final price with everything included; the only price customers see */
  priceEur: number | null;
}

export interface FilterOptions {
  makes: string[];
  fuelTypes: FuelType[];
  transmissions: Transmission[];
  origins: Origin[];
}

/** How the final price was built (admin only). */
/** How the final price was built. The calculated parts are null when the price was set by hand without a source price. */
export interface PriceBreakdown {
  profile: PriceProfile | null;
  sourcePrice: number | null;
  sourceCurrency: string | null;
  carPriceEur: number | null;
  baseCostsEur: number | null;
  steps: number | null;
  stepCostsEur: number | null;
  profitEur: number | null;
  profitOverridden: boolean;
  /** what the formula gives; null when it cannot be calculated */
  calculatedTotalEur: number | null;
  totalEur: number;
  /** totalEur was set by hand */
  fixedTotal: boolean;
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

export type SocialNetwork = "FACEBOOK" | "INSTAGRAM" | "VIBER";

/** A car published to Facebook/Instagram/Viber from the admin panel (backend SocialPost). */
export interface SocialPost {
  id: number;
  carId: number;
  network: SocialNetwork;
  externalId: string;
  permalink: string | null;
  photos: number;
  createdAt: string;
}

/** Which networks the backend can publish to (backend SocialPublisher.Status). */
export interface SocialStatus {
  facebook: boolean;
  instagram: boolean;
  viber: boolean;
}

/** A post text template saved in the admin panel (backend PostTemplate). */
export interface PostTemplate {
  network: SocialNetwork;
  body: string;
  updatedAt: string;
}

/** Business details shared by all post templates (backend PostSettings); null = the default from site.ts. */
export interface PostSettings {
  phone: string | null;
  viberLink: string | null;
  office: string | null;
}

export interface ViberConnectResponse {
  callbackUrl: string;
}
