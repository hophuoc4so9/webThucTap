import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  async login(loginDto: LoginDto) {
    // Xử lý đăng nhập ở đây
    return { accessToken: 'fake-jwt-token', user: loginDto };
  }
}
