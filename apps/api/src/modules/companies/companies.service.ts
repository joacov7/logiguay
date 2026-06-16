import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, userId: string) {
    let cuit = dto.cuit?.trim();
    if (cuit) {
      const existing = await this.prisma.company.findUnique({ where: { cuit } });
      if (existing) throw new ConflictException('CUIT ya registrado');
    } else {
      cuit = await this.generateUniqueCuit();
    }

    const company = await this.prisma.company.create({ data: { ...dto, cuit } });

    await this.prisma.companyUser.create({
      data: { userId, companyId: company.id, role: 'ADMIN' },
    });

    return company;
  }

  /** Genera un CUIT placeholder único (el usuario lo edita luego con el real). */
  async generateUniqueCuit(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const rand = Math.floor(10000000 + Math.random() * 90000000);
      const cuit = `00-${rand}-0`;
      const existing = await this.prisma.company.findUnique({ where: { cuit } });
      if (!existing) return cuit;
    }
    return `00-${Date.now().toString().slice(-8)}-0`;
  }

  async findAll(page = 1, limit = 20) {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const skip = (p - 1) * l;
    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { vehicles: true, drivers: true } } },
      }),
      this.prisma.company.count(),
    ]);
    return { data, total, page: p, limit: l, pages: Math.ceil(total / l) };
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
    if (dto.cuit) {
      const existing = await this.prisma.company.findUnique({ where: { cuit: dto.cuit } });
      if (existing && existing.id !== id) throw new ConflictException('CUIT ya registrado');
    }
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
