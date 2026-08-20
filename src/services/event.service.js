import prisma from "../config/db.js";
import { EventRepository } from "./event.repository.js";
import { slugify } from "../utils/slugify.util.js";

export class EventService {
  static async getAllEvents(query) {
    const search = query.search ? String(query.search).trim() : undefined;
    const categoryId = query.categoryId ? String(query.categoryId).trim() : undefined;
    const status = query.status ? String(query.status).trim() : undefined;
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "50", 10);

    return EventRepository.findAll({ search, categoryId, status, page, limit });
  }

  static async getEventById(id) {
    const event = await EventRepository.findById(id);
    if (!event) {
      throw { statusCode: 404, message: "Event not found" };
    }
    return event;
  }

  static async createEvent(data) {
    if (!data.title || !String(data.title).trim()) {
      throw { statusCode: 400, message: "Event title is required" };
    }
    if (!data.distance || !String(data.distance).trim()) {
      throw { statusCode: 400, message: "Event distance is required" };
    }
    
    const parsedPrice = data.price !== undefined ? parseFloat(data.price) : (data.registrationFee !== undefined ? parseFloat(data.registrationFee) : 0);
    if (parsedPrice < 0) {
      throw { statusCode: 400, message: "Event price cannot be negative" };
    }

    const title = String(data.title).trim();
    let slug = data.slug ? slugify(data.slug) : slugify(title);

    const existing = await EventRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const eventData = {
      title,
      slug,
      subtitle: data.subtitle || null,
      distance: String(data.distance).trim(),
      date: data.date ? new Date(data.date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      location: data.location || "Munnar, Kerala",
      price: data.price !== undefined ? parseFloat(data.price) : (data.registrationFee !== undefined ? parseFloat(data.registrationFee) : 0),
      maxCapacity: data.maxCapacity !== undefined ? parseInt(data.maxCapacity, 10) : (data.maxParticipants !== undefined ? parseInt(data.maxParticipants, 10) : 500),
      description: data.description || null,
      shortDescription: data.shortDescription || null,
      bannerImage: data.bannerImage || null,
      galleryImages: data.galleryImages ? (Array.isArray(data.galleryImages) ? data.galleryImages : [data.galleryImages]) : [],
      brochure: data.brochure || null,
      sponsorLogos: data.sponsorLogos ? (Array.isArray(data.sponsorLogos) ? data.sponsorLogos : [data.sponsorLogos]) : [],
      status: data.status || "OPEN",
      elevationGain: data.elevationGain || null,
      cutoffTime: data.cutoffTime || null,
      categoryId: data.categoryId || null,
      eventType: data.eventType || null,

      // Dynamic Page Fields
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      regOpen: data.regOpen ? new Date(data.regOpen) : null,
      regClose: data.regClose ? new Date(data.regClose) : null,
      venue: data.venue || null,
      address: data.address || null,
      mapLink: data.mapLink || null,
      difficulty: data.difficulty || null,
      routeDescription: data.routeDescription || null,
      waitingList: data.waitingList !== undefined ? Boolean(data.waitingList) : false,
      ageLimit: data.ageLimit || null,
      emergencyContactReq: data.emergencyContactReq !== undefined ? Boolean(data.emergencyContactReq) : true,
      idProofReq: data.idProofReq !== undefined ? Boolean(data.idProofReq) : true,
      medicalCertificateReq: data.medicalCertificateReq !== undefined ? Boolean(data.medicalCertificateReq) : false,
      terms: data.terms || null,
      earlyBirdFee: data.earlyBirdFee ? parseFloat(data.earlyBirdFee) : null,
      couponsEnabled: data.couponsEnabled !== undefined ? Boolean(data.couponsEnabled) : false,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      keywords: data.keywords || null,
      schedule: data.schedule || null,
      includes: data.includes || [],
      rules: data.rules || null,
      faqs: data.faqs || null,
      tickets: data.tickets || null,
    };

    if (data.routes && Array.isArray(data.routes)) {
      eventData.routes = {
        create: data.routes.map(r => ({
          title: r.title || title,
          slug: r.slug || `${slug}-route-${Date.now().toString().slice(-4)}`,
          distance: r.distance || eventData.distance,
          elevationProfile: r.elevationProfile || null,
          gpxUrl: r.gpxUrl || null,
          mapImageUrl: r.mapImageUrl || null,
        }))
      };
    }
    if (data.categoryName && !eventData.categoryId) {
      const dbCat = await prisma.eventCategory.findFirst({ where: { name: data.categoryName } });
      if (dbCat) eventData.categoryId = dbCat.id;
    }

    return EventRepository.create(eventData);
  }

  static async updateEvent(id, data) {
    await this.getEventById(id);

    const updateData = {};
    if (data.title !== undefined) {
      updateData.title = String(data.title).trim();
      updateData.slug = data.slug ? slugify(data.slug) : slugify(updateData.title);
    }
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.distance !== undefined) updateData.distance = String(data.distance).trim();
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.location !== undefined) updateData.location = data.location;
    if (data.price !== undefined || data.registrationFee !== undefined) {
      updateData.price = parseFloat(data.price ?? data.registrationFee);
    }
    if (data.maxCapacity !== undefined || data.maxParticipants !== undefined) {
      updateData.maxCapacity = parseInt(data.maxCapacity ?? data.maxParticipants, 10);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.bannerImage !== undefined) updateData.bannerImage = data.bannerImage;
    if (data.galleryImages !== undefined) updateData.galleryImages = Array.isArray(data.galleryImages) ? data.galleryImages : [data.galleryImages];
    if (data.brochure !== undefined) updateData.brochure = data.brochure;
    if (data.sponsorLogos !== undefined) updateData.sponsorLogos = Array.isArray(data.sponsorLogos) ? data.sponsorLogos : [data.sponsorLogos];
    if (data.status !== undefined) updateData.status = data.status;
    if (data.elevationGain !== undefined) updateData.elevationGain = data.elevationGain;
    if (data.cutoffTime !== undefined) updateData.cutoffTime = data.cutoffTime;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.categoryName !== undefined && !data.categoryId) {
      const dbCat = await prisma.eventCategory.findFirst({ where: { name: data.categoryName } });
      if (dbCat) updateData.categoryId = dbCat.id;
    }

    // Dynamic Page Fields
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.regOpen !== undefined) updateData.regOpen = data.regOpen ? new Date(data.regOpen) : null;
    if (data.regClose !== undefined) updateData.regClose = data.regClose ? new Date(data.regClose) : null;
    if (data.venue !== undefined) updateData.venue = data.venue;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.mapLink !== undefined) updateData.mapLink = data.mapLink;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.routeDescription !== undefined) updateData.routeDescription = data.routeDescription;
    if (data.waitingList !== undefined) updateData.waitingList = Boolean(data.waitingList);
    if (data.ageLimit !== undefined) updateData.ageLimit = data.ageLimit;
    if (data.emergencyContactReq !== undefined) updateData.emergencyContactReq = Boolean(data.emergencyContactReq);
    if (data.idProofReq !== undefined) updateData.idProofReq = Boolean(data.idProofReq);
    if (data.medicalCertificateReq !== undefined) updateData.medicalCertificateReq = Boolean(data.medicalCertificateReq);
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.earlyBirdFee !== undefined) updateData.earlyBirdFee = data.earlyBirdFee ? parseFloat(data.earlyBirdFee) : null;
    if (data.couponsEnabled !== undefined) updateData.couponsEnabled = Boolean(data.couponsEnabled);
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.keywords !== undefined) updateData.keywords = data.keywords;
    if (data.schedule !== undefined) updateData.schedule = data.schedule;
    if (data.includes !== undefined) updateData.includes = data.includes;
    if (data.rules !== undefined) updateData.rules = data.rules;
    if (data.faqs !== undefined) updateData.faqs = data.faqs;
    if (data.tickets !== undefined) updateData.tickets = data.tickets;

    if (data.routes && Array.isArray(data.routes)) {
      const existing = await this.getEventById(id);
      const existingRoutes = existing.routes || [];

      // Simplified approach: just create new routes or update existing ones based on length
      // For a more robust approach, we would use an upsert with route IDs.
      updateData.routes = {
        deleteMany: {}, // Clean up old routes
        create: data.routes.map(r => ({
          title: r.title || updateData.title || existing.title,
          slug: r.slug || `${existing.slug}-route-${Date.now().toString().slice(-4)}`,
          distance: r.distance || updateData.distance || existing.distance,
          elevationProfile: r.elevationProfile || null,
          gpxUrl: r.gpxUrl || null,
          mapImageUrl: r.mapImageUrl || null,
        }))
      };
    }

    return EventRepository.update(id, updateData);
  }

  static async deleteEvent(id) {
    await this.getEventById(id);
    return EventRepository.hardDelete(id);
  }
}
