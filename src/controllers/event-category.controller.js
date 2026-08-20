import { EventCategoryService } from "../services/event-category.service.js";

export class EventCategoryController {
  static async getAll(req, res, next) {
    try {
      const result = await EventCategoryService.getAllCategories(req.query);
      res.json({
        success: true,
        data: result.categories,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const category = await EventCategoryService.getCategoryById(req.params.id);
      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const category = await EventCategoryService.createCategory(req.body);
      res.status(201).json({
        success: true,
        message: "Event category created successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const category = await EventCategoryService.updateCategory(req.params.id, req.body);
      res.json({
        success: true,
        message: "Event category updated successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await EventCategoryService.deleteCategory(req.params.id);
      res.json({
        success: true,
        message: "Event category deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
