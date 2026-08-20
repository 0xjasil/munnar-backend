import { EventCategoryRepository } from "./event-category.repository.js";
import { slugify } from "../utils/slugify.util.js";

export class EventCategoryService {
  static async getAllCategories(query) {
    const search = query.search ? String(query.search).trim() : undefined;
    const active = query.active !== undefined ? query.active === "true" || query.active === true : undefined;
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "50", 10);

    return EventCategoryRepository.findAll({ search, active, page, limit });
  }

  static async getCategoryById(id) {
    const category = await EventCategoryRepository.findById(id);
    if (!category) {
      throw { statusCode: 404, message: "Event Category not found" };
    }
    return category;
  }

  static async createCategory(data) {
    if (!data.name || !String(data.name).trim()) {
      throw { statusCode: 400, message: "Category name is required" };
    }

    const name = String(data.name).trim();

    // Check if category with this name already exists (including soft-deleted)
    const existingByName = await EventCategoryRepository.findByName(name);
    if (existingByName) {
      if (existingByName.deletedAt) {
        // If soft-deleted, reactivate and update with the newly provided information
        return EventCategoryRepository.update(existingByName.id, {
          name,
          deletedAt: null,
          active: data.active !== undefined ? Boolean(data.active) : true,
          description: data.description || null,
          icon: data.icon || null,
          distance: data.distance ? String(data.distance).trim() : null,
          startingPrice:
            data.startingPrice !== undefined && data.startingPrice !== null && data.startingPrice !== ""
              ? parseFloat(data.startingPrice)
              : null,
          displayOrder: data.displayOrder ? parseInt(data.displayOrder, 10) : 0,
        });
      } else {
        throw { statusCode: 400, message: `A category named "${name}" already exists.` };
      }
    }

    let slug = data.slug ? slugify(data.slug) : slugify(name);
    let existingSlug = await EventCategoryRepository.findBySlug(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    return EventCategoryRepository.create({
      name,
      slug,
      description: data.description || null,
      icon: data.icon || null,
      distance: data.distance ? String(data.distance).trim() : null,
      startingPrice:
        data.startingPrice !== undefined && data.startingPrice !== null && data.startingPrice !== ""
          ? parseFloat(data.startingPrice)
          : null,
      displayOrder: data.displayOrder ? parseInt(data.displayOrder, 10) : 0,
      active: data.active !== undefined ? Boolean(data.active) : true,
    });
  }

  static async updateCategory(id, data) {
    const existing = await this.getCategoryById(id);

    const updateData = {};
    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (name.toLowerCase() !== existing.name.toLowerCase()) {
        const nameConflict = await EventCategoryRepository.findByName(name);
        if (nameConflict && nameConflict.id !== id) {
          throw { statusCode: 400, message: `Another category named "${name}" already exists.` };
        }
      }
      updateData.name = name;
      updateData.slug = data.slug ? slugify(data.slug) : slugify(updateData.name);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.distance !== undefined) {
      updateData.distance = data.distance ? String(data.distance).trim() : null;
    }
    if (data.startingPrice !== undefined) {
      updateData.startingPrice =
        data.startingPrice !== null && data.startingPrice !== ""
          ? parseFloat(data.startingPrice)
          : null;
    }
    if (data.displayOrder !== undefined) updateData.displayOrder = parseInt(data.displayOrder, 10);
    if (data.active !== undefined) updateData.active = Boolean(data.active);

    return EventCategoryRepository.update(id, updateData);
  }

  static async deleteCategory(id) {
    await this.getCategoryById(id);
    return EventCategoryRepository.softDelete(id);
  }
}
