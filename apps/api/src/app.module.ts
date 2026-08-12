import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MetersModule } from './meters/meter.module';
import { TariffsModule } from './tariffs/tariff.module';
import { BudgetsModule } from './budgets/budget.module';
import { AnomaliesModule } from './anomalies/anomaly.module';
import { DevicesModule } from './devices/device.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/report.module';
import { SettingsModule } from './settings/settings.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DATABASE_TYPE', 'better-sqlite3');
        if (dbType === 'postgres') {
          return {
            type: 'postgres' as const,
            url: config.get<string>('DATABASE_URL'),
            ssl: { rejectUnauthorized: false },
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        return {
          type: 'better-sqlite3' as const,
          database: config.get<string>('DATABASE_PATH', 'data/gridgauge.db'),
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    AuthModule,
    MetersModule,
    TariffsModule,
    BudgetsModule,
    AnomaliesModule,
    DevicesModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    SeedModule,
  ],
})
export class AppModule {}
