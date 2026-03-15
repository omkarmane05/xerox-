
export enum PrintColor {
  BW = 'Black & White',
  COLOR = 'Color'
}

export enum PagesPerSheet {
  ONE = 1,
  TWO = 2,
  FOUR = 4
}

export enum Orientation {
  PORTRAIT = 'Portrait',
  LANDSCAPE = 'Landscape'
}

export enum JobStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  PRINTING = 'Printing',
  COMPLETED = 'Completed'
}

export interface PrintJob {
  id: string;
  shopId: string; // Target shop for this job
  filename: string;
  fileUrl: string; // Blob URL (In-memory)
  fileType: string;
  numCopies: number;
  color: PrintColor;
  pagesPerSheet: PagesPerSheet;
  pageRange: string;
  orientation: Orientation;
  otp: string;
  status: JobStatus;
  timestamp: number;
  estimatedCost: number;
}

export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  qrCodeUrl: string;
}

export interface ShopOwner {
  id: string;
  email: string;
  name: string;
  shopId?: string;
}

export interface SystemState {
  jobs: PrintJob[];
}
