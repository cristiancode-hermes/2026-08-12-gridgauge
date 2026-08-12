import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportService } from './report.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(':year/:month')
  report(@CurrentUser('id') userId: string, @Param('year') year: string, @Param('month') month: string) {
    return this.reportService.monthlyReport(userId, Number(year), Number(month));
  }

  @Get(':year/:month/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @CurrentUser('id') userId: string,
    @Param('year') year: string,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const csv = await this.reportService.exportCsv(userId, Number(year), Number(month));
    res.setHeader('Content-Disposition', `attachment; filename="gridgauge-report-${year}-${month}.csv"`);
    res.send(csv);
  }
}
