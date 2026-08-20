import { EventRouteService } from "../services/event-route.service.js";

export class EventRouteController {
  static async getAll(req, res, next) {
    try {
      const result = await EventRouteService.getAllRoutes(req.query);
      res.json({
        success: true,
        data: result.routes,
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
      const route = await EventRouteService.getRouteById(req.params.id);
      res.json({
        success: true,
        data: route,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByEventId(req, res, next) {
    try {
      const routes = await EventRouteService.getRoutesByEventId(req.params.eventId);
      res.json({
        success: true,
        data: routes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const route = await EventRouteService.createRoute(req.body);
      res.status(201).json({
        success: true,
        message: "Event route created successfully",
        data: route,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const route = await EventRouteService.updateRoute(req.params.id, req.body);
      res.json({
        success: true,
        message: "Event route updated successfully",
        data: route,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await EventRouteService.deleteRoute(req.params.id);
      res.json({
        success: true,
        message: "Event route deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
