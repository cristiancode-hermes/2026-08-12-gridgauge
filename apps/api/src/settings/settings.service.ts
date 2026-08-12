import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateCo2Dto, UpdatePrefsDto } from '../dto/api.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async updateCo2(userId: string, dto: UpdateCo2Dto): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    user.co2Factors = {
      electricity: dto.electricity,
      water: dto.water,
      gas: dto.gas,
    };
    return (await this.usersRepo.save(user)) as unknown as User;
  }

  async updatePrefs(userId: string, dto: UpdatePrefsDto): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const prefs = user.prefs ?? {
      spikeThresholdSigma: 2.5,
      quietWindow: { start: '02:00', end: '05:00' },
      quietWindowEnabled: true,
    };
    if (dto.spikeThresholdSigma !== undefined) prefs.spikeThresholdSigma = dto.spikeThresholdSigma;
    if (dto.quietWindow !== undefined) prefs.quietWindow = dto.quietWindow;
    if (dto.quietWindowEnabled !== undefined) prefs.quietWindowEnabled = dto.quietWindowEnabled;
    user.prefs = prefs;
    return (await this.usersRepo.save(user)) as unknown as User;
  }
}
