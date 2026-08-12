import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto, RegisterDto, UpdateProfileDto } from '../dto/api.dto';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  currency: string;
  timezone: string;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ token: string; user: AuthUser }> {
    const email = dto.email.toLowerCase();
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('EMAIL_IN_USE');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email,
      passwordHash,
      displayName: dto.displayName ?? null,
      currency: 'EUR',
      timezone: 'Europe/Madrid',
    } as any);
    const saved = (await this.usersRepo.save(user)) as unknown as User;
    return { token: this.signToken(saved), user: this.toAuthUser(saved) };
  }

  async login(dto: LoginDto): Promise<{ token: string; user: AuthUser }> {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    return { token: this.signToken(user), user: this.toAuthUser(user) };
  }

  async profile(userId: string): Promise<AuthUser> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.toAuthUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.currency !== undefined) user.currency = dto.currency;
    const saved = (await this.usersRepo.save(user)) as unknown as User;
    return this.toAuthUser(saved);
  }

  private signToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      currency: user.currency,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }
}
