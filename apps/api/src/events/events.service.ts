import { Injectable } from "@nestjs/common";
import { prisma } from "@snapdeliver/database";

interface CreateEventData {
  name: string;
  date: Date;
  expiry: Date;
  pricing_tier: "FREE" | "STANDARD" | "PREMIUM";
}

interface UpdateEventData {
  name?: string;
  date?: Date;
  expiry?: Date;
  pricing_tier?: "FREE" | "STANDARD" | "PREMIUM";
}

@Injectable()
export class EventsService {
  async create(data: CreateEventData) {
    return prisma.event.create({
      data: {
        name: data.name,
        date: data.date,
        expiry: data.expiry,
        pricing_tier: data.pricing_tier,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.event.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return prisma.event.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: UpdateEventData) {
    return prisma.event.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.date && { date: data.date }),
        ...(data.expiry && { expiry: data.expiry }),
        ...(data.pricing_tier && { pricing_tier: data.pricing_tier }),
      },
    });
  }

  async remove(id: string) {
    return prisma.event.delete({
      where: { id },
    });
  }
}
