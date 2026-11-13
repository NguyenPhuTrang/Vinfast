// File này quy định rằng bất kỳ dịch vụ lưu trữ nào muốn dùng cloudinary được sử dụng trong hệ thống đều phải tuân theo cấu trúc mà interface này định nghĩa.
export type StorageResourceType = 'image' | 'video' | 'raw';

export interface UploadMediaInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder: string;
}

export interface UploadMediaResult {
  storageKey: string;
  publicUrl: string;
  format: string;
  resourceType: StorageResourceType;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface MediaStorageInterface {
  upload(input: UploadMediaInput): Promise<UploadMediaResult>;

  delete(
    storageKey: string,
    resourceType: StorageResourceType,
  ): Promise<boolean>;
}

export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');
