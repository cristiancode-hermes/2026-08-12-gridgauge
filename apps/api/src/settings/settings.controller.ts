import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateCo2Dto, UpdatePrefsDto } from '../dto/api.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('co2')
  updateCo2(@CurrentUser('id') userId: string, @Body() dto: UpdateCo2Dto) {
    return this.settingsService.updateCo2(userId, dto);
  }

  @Patch('prefs')
  updatePrefs(@CurrentUser('id') userId: string, @Body() dto: UpdatePrefsDto) {
    return this.settingsService.updatePrefs(userId, dto);
  }
}
