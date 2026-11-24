import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { BadRequestException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Database } from './database';

const derive = promisify(scrypt);
const lifetime = 8 * 60 * 60;
const keyPattern = /^[a-f0-9]{64}$/;
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,63}$/i;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function sessionCookie(token: string, maxAge: number) {
  const secure = process.env.CV_ADMIN_SECURE_COOKIE === '1' ? '; Secure' : '';
  return `cv_admin=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function readToken(cookie: string | undefined) {
  const value = cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('cv_admin='))?.slice(9);
  return value && keyPattern.test(value) ? value : undefined;
}

@Injectable()
export class AdminAuth {
  private attempts = 0;
  private windowEnds = 0;

  constructor(private readonly database: Database) {}

  async login(body: { username?: unknown; password?: unknown } | undefined) {
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const fieldErrors: { username?: string; password?: string } = {};
    if (body?.username != null && typeof body.username !== 'string') {
      fieldErrors.username = 'Tên tài khoản không hợp lệ.';
    } else if (!username) {
      fieldErrors.username = 'Vui lòng nhập tên tài khoản.';
    } else if (!usernamePattern.test(username)) {
      fieldErrors.username = 'Dùng 3–64 ký tự gồm chữ cái, chữ số, dấu chấm, gạch dưới hoặc gạch nối và bắt đầu bằng chữ cái hoặc chữ số.';
    }
    if (body?.password != null && typeof body.password !== 'string') {
      fieldErrors.password = 'Mật khẩu không hợp lệ.';
    } else if (!password) {
      fieldErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length > 512) {
      fieldErrors.password = 'Mật khẩu tối đa 512 ký tự.';
    }
    if (Object.keys(fieldErrors).length) {
      throw new BadRequestException({ message: 'Kiểm tra thông tin đăng nhập.', fieldErrors });
    }

    const configuredUsername = process.env.CV_ADMIN_USERNAME ?? 'admin';
    const configured = process.env.CV_ADMIN_PASSWORD_HASH;
    const match = /^([a-f0-9]{32}):([a-f0-9]{128})$/.exec(configured ?? '');
    if (!match || !usernamePattern.test(configuredUsername)) {
      throw new ServiceUnavailableException('Tài khoản quản trị chưa được thiết lập. Xem hướng dẫn cấu hình cục bộ.');
    }
    const now = Date.now();
    if (now >= this.windowEnds) {
      this.attempts = 0;
      this.windowEnds = now + 60_000;
    }
    if (++this.attempts > 8) throw new HttpException('Thử lại sau một phút.', 429);
    const candidate = await derive(password, Buffer.from(match[1], 'hex'), 64) as Buffer;
    const passwordMatches = timingSafeEqual(candidate, Buffer.from(match[2], 'hex'));
    const usernameMatches = timingSafeEqual(
      Buffer.from(hash(username.toLowerCase()), 'hex'),
      Buffer.from(hash(configuredUsername.toLowerCase()), 'hex'),
    );
    if (!usernameMatches || !passwordMatches) throw new UnauthorizedException('Tên tài khoản hoặc mật khẩu không đúng.');
    this.attempts = 0;
    const token = randomBytes(32).toString('hex');
    await this.database.db.$transaction([
      this.database.db.adminSession.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
      this.database.db.adminSession.create({ data: { tokenHash: hash(token), expiresAt: new Date(now + lifetime * 1000) } }),
    ]);
    return sessionCookie(token, lifetime);
  }

  async require(cookie: string | undefined) {
    const token = readToken(cookie);
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const session = await this.database.db.adminSession.findUnique({ where: { tokenHash: hash(token) } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
  }

  async logout(cookie: string | undefined) {
    const token = readToken(cookie);
    if (token) await this.database.db.adminSession.deleteMany({ where: { tokenHash: hash(token) } });
  }
}
