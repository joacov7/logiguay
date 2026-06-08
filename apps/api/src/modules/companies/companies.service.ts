import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, userId: string) {
    const existing = await this.prisma.company.findUnique({ where: { cuit: dto.cuit } });
    if (existing) throw new ConflictException('CUIT ya registrado');

    const company = await this.prisma.company.create({ data: dto });

    await this.prisma.companyUser.create({
      data: { userId, companyId: company.id, role: 'ADMIN' },
    });

    return company;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { vehicles: true, drivers: true } } },
      }),
      this.prisma.company.count(),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        branches: true,
        companyUsers: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
        _count: { select: { vehicles: true, drivers: true, cargos: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async getUserCompanies(userId: string) {
    return this.prisma.companyUser.findMany({
      where: { userId },
      include: { company: true },
    });
  }

  async addUserToCompany(companyId: string, userId: string, role: string) {
    return this.prisma.companyUser.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { userId, companyId, role: role as any },
      update: { role: role as any },
    });
  }
}
