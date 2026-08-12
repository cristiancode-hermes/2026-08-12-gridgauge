import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'gridgauge-dev-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      currency: user.currency,
      timezone: user.timezone,
    };
  }
}
