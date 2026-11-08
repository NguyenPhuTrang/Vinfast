export interface ApiSuccessResponse<T> { // <T>: gọi là generic, tức là một “kiểu dữ liệu giữ chỗ”. Mỗi API trả về dữ liệu khác nhau, nên T cho phép bạn tự chọn kiểu của data khi dùng.
  success: true;
  statusCode: number;
  timestamp: string; // thời điểm server trả response.
  path: string;
  data: T; // dữ liệu thực sự, kiểu phụ thuộc vào T.
}