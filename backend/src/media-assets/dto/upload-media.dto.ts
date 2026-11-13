
import { IsIn } from 'class-validator';

export class UploadMediaDto {
  @IsIn(['vehicles', 'news', 'gallery', 'general'], {
    message: 'Folder must be vehicles, news, gallery or general',
  })
  folder: 'vehicles' | 'news' | 'gallery' | 'general';
}
