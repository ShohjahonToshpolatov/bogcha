import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly config: ConfigService,
  ) {}

  async save(file: Express.Multer.File, uploadedById: string) {
    const url = `${this.config.get<string>('appUrl')}/uploads/${file.filename}`;
    return this.tenantPrisma.client.media.create({
      data: {
        tenantId: this.tenantPrisma.tenantId!,
        url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById,
      },
    });
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.tenantPrisma.client.media.findMany({ where: { id: { in: ids } } });
  }
}
