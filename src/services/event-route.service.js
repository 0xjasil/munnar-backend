import { EventRouteRepository } from "./event-route.repository.js";
import { slugify } from "../utils/slugify.util.js";

export class EventRouteService {
  static async getAllRoutes(query) {
    const search = query.search ? String(query.search).trim() : undefined;
    const eventId = query.eventId ? String(query.eventId).trim() : undefined;
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "50", 10);

    return EventRouteRepository.findAll({ search, eventId, page, limit });
  }

  static async getRouteById(id) {
    const route = await EventRouteRepository.findById(id);
    if (!route) {
      throw { statusCode: 404, message: "Event Route not found" };
    }
    return route;
  }

  static async getRoutesByEventId(eventId) {
    return EventRouteRepository.findByEventId(eventId);
  }

  static async createRoute(data) {
    if (!data.title || !String(data.title).trim()) {
      throw { statusCode: 400, message: "Route title is required" };
    }
    if (!data.eventId || !String(data.eventId).trim()) {
      throw { statusCode: 400, message: "Associated event ID is required" };
    }
    if (!data.distance || !String(data.distance).trim()) {
      throw { statusCode: 400, message: "Route distance is required" };
    }

    const title = String(data.title).trim();
    let slug = data.slug ? slugify(data.slug) : slugify(title);

    const existing = await EventRouteRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const routeData = {
      title,
      slug,
      eventId: String(data.eventId).trim(),
      distance: String(data.distance).trim(),
      elevationProfile: data.elevationProfile || null,
      gpxUrl: data.gpxUrl || null,
      mapImageUrl: data.mapImageUrl || null,
      difficulty: data.difficulty || null,
      description: data.description || null,
      checkpoints: Array.isArray(data.checkpoints) ? data.checkpoints : [],
      displayOrder: data.displayOrder ? parseInt(data.displayOrder, 10) : 0,
    };

    return EventRouteRepository.create(routeData);
  }

  static async updateRoute(id, data) {
    await this.getRouteById(id);

    const updateData = {};
    if (data.title !== undefined) {
      updateData.title = String(data.title).trim();
      updateData.slug = data.slug ? slugify(data.slug) : slugify(updateData.title);
    }
    if (data.eventId !== undefined) updateData.eventId = String(data.eventId).trim();
    if (data.distance !== undefined) updateData.distance = String(data.distance).trim();
    if (data.elevationProfile !== undefined) updateData.elevationProfile = data.elevationProfile;
    if (data.gpxUrl !== undefined) updateData.gpxUrl = data.gpxUrl;
    if (data.mapImageUrl !== undefined) updateData.mapImageUrl = data.mapImageUrl;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.checkpoints !== undefined) {
      updateData.checkpoints = Array.isArray(data.checkpoints) ? data.checkpoints : [];
    }
    if (data.displayOrder !== undefined) updateData.displayOrder = parseInt(data.displayOrder, 10);

    return EventRouteRepository.update(id, updateData);
  }

  static async deleteRoute(id) {
    await this.getRouteById(id);
    return EventRouteRepository.softDelete(id);
  }
}
