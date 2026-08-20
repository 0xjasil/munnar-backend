import { EventService } from "../services/event.service.js";

export class EventController {
  static async getAll(req, res, next) {
    try {
      const result = await EventService.getAllEvents(req.query);
      res.json({
        success: true,
        data: result.events,
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
      const event = await EventService.getEventById(req.params.id);
      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const event = await EventService.createEvent(req.body);
      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const event = await EventService.updateEvent(req.params.id, req.body);
      res.json({
        success: true,
        message: "Event updated successfully",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await EventService.deleteEvent(req.params.id);
      res.json({
        success: true,
        message: "Event deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
