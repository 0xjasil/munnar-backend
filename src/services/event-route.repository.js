import prisma from "../config/db.js";

export class EventRouteRepository {
  static async findAll({ search, eventId, page = 1, limit = 50 }) {
    const where = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { distance: { contains: search, mode: "insensitive" } },
      ];
    }

    if (eventId) {
      where.eventId = eventId;
    }

    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      prisma.eventRoute.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, slug: true, distance: true } },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.eventRoute.count({ where }),
    ]);

    return { routes, total, page, limit };
  }

  static async findById(id) {
    return prisma.eventRoute.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        event: true,
      },
    });
  }

  static async findByEventId(eventId) {
    return prisma.eventRoute.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });
  }

  static async findBySlug(slug) {
    return prisma.eventRoute.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  static async create(data) {
    return prisma.eventRoute.create({
      data,
      include: { event: true },
    });
  }

  static async update(id, data) {
    return prisma.eventRoute.update({
      where: { id },
      data,
      include: { event: true },
    });
  }

  static async softDelete(id) {
    return prisma.eventRoute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
