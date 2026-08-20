import prisma from "../config/db.js";

export class EventRepository {
  static async findAll({ search, categoryId, status, page = 1, limit = 50 }) {
    const where = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { subtitle: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          routes: { where: { deletedAt: null } },
          _count: {
            select: { registrations: true, results: true },
          },
        },
        orderBy: [{ date: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  static async findById(id) {
    return prisma.event.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        category: true,
        routes: {
          where: { deletedAt: null },
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { registrations: true, results: true },
        },
      },
    });
  }

  static async findBySlug(slug) {
    return prisma.event.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  static async create(data) {
    return prisma.event.create({
      data,
      include: {
        category: true,
        routes: true,
      },
    });
  }

  static async update(id, data) {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        category: true,
        routes: { where: { deletedAt: null } },
      },
    });
  }

  static async hardDelete(id) {
    return prisma.event.delete({
      where: { id },
    });
  }
}
