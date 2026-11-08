// chức năng bảo vệ các API yêu cầu người dùng phải đăng nhập bằng JWT Access Token.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}