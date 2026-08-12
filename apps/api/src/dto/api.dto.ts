import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'casa@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'sup3r-segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Mi hogar' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'casa@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'sup3r-segura' })
  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class UpdateCo2Dto {
  @ApiProperty({ example: 0.21 })
  @IsNumber()
  electricity: number;

  @ApiProperty({ example: 0.34 })
  @IsNumber()
  water: number;

  @ApiProperty({ example: 2.04 })
  @IsNumber()
  gas: number;
}

export class UpdatePrefsDto {
  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  spikeThresholdSigma?: number;

  @ApiPropertyOptional({ example: { start: '02:00', end: '05:00' } })
  @IsOptional()
  @IsObject()
  quietWindow?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  quietWindowEnabled?: boolean;
}

export class CreateMeterDto {
  @ApiProperty({ example: 'Contador principal' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: ['electricity', 'water', 'gas'] })
  @IsIn(['electricity', 'water', 'gas'])
  utilityType: 'electricity' | 'water' | 'gas';

  @ApiPropertyOptional({ example: 'Cocina' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional({ example: 'ES-1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tariffId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  active?: boolean;
}

export class UpdateMeterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tariffId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;
}

export class CreateReadingDto {
  @ApiProperty({ example: '2026-08-12T00:00:00Z' })
  @IsString()
  periodStart: string;

  @ApiProperty({ example: '2026-08-12T23:59:00Z' })
  @IsString()
  periodEnd: string;

  @ApiProperty({ example: 4.1 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: 'Lectura manual' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class CreateTariffDto {
  @ApiProperty({ example: 'Hogar 2.0 TD' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: ['electricity', 'water', 'gas'] })
  @IsIn(['electricity', 'water', 'gas'])
  utilityType: 'electricity' | 'water' | 'gas';

  @ApiProperty({ example: 0.15 })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ default: 0, example: 3.1 })
  @IsOptional()
  @IsNumber()
  fixedFee?: number;

  @ApiPropertyOptional({ example: [{ upTo: 100, price: 0.15 }, { upTo: 250, price: 0.17 }, { price: 0.2 }] })
  @IsOptional()
  @IsObject()
  tiers?: { upTo?: number; price: number }[] | null;

  @ApiPropertyOptional({
    example: { enabled: true, peakHours: [[23, 7]], peakPrice: 0.25, offPeakPrice: 0.11 },
  })
  @IsOptional()
  @IsObject()
  peakOffPeak?: {
    enabled: boolean;
    peakHours: [number, number][];
    peakPrice: number;
    offPeakPrice: number;
  } | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  active?: boolean;
}

export class UpdateTariffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fixedFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tiers?: { upTo?: number; price: number }[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  peakOffPeak?: {
    enabled: boolean;
    peakHours: [number, number][];
    peakPrice: number;
    offPeakPrice: number;
  } | null;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;
}

export class CreateBudgetDto {
  @ApiProperty()
  @IsString()
  meterId: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  period: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  amount: number;
}

export class UpdateBudgetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class CreateDeviceDto {
  @ApiProperty()
  @IsString()
  meterId: string;

  @ApiProperty({ example: 'Frigorífico' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  wattage: number;

  @ApiProperty({ example: 7.5 })
  @IsNumber()
  hoursPerDay: number;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  wattage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hoursPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;
}

export class ResolveAnomalyDto {
  @ApiPropertyOptional({ example: 'Aire acondicionado encendido' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
