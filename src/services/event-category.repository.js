import prisma from "../config/db.js";

export class EventCategoryRepository {
  static async findAll({ search, active, page = 1, limit = 50 }) {
    const where = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (typeof active === "boolean") {
      where.active = active;
    }

    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      prisma.eventCategory.findMany({
        where,
        include: {
          _count: {
            select: { events: { where: { deletedAt: null } } },
          },
          events: {
            where: { deletedAt: null, status: "OPEN" },
            orderBy: { price: "asc" },
            take: 1,
            select: { slug: true, distance: true, price: true },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.eventCategory.count({ where }),
    ]);

    return { categories, total, page, limit };
  }

  static async findById(id) {
    return prisma.eventCategory.findFirst({
      where: { id, deletedAt: null },
      include: {
        events: {
          where: { deletedAt: null },
        },
      },
    });
  }

  static async findByName(name) {
    return prisma.eventCategory.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  }

  static async findBySlug(slug) {
    return prisma.eventCategory.findFirst({
      where: { slug },
    });
  }

  static async create(data) {
    return prisma.eventCategory.create({
      data,
    });
  }

  static async update(id, data) {
    return prisma.eventCategory.update({
      where: { id },
      data,
    });
  }

  static async softDelete(id) {
    return prisma.eventCategory.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
