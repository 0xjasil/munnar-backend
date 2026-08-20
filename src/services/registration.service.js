import prisma from "../config/db.js";
import { AppError } from "../utils/appError.js";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

export class RegistrationService {
  /**
   * Get registrations based on role (with pagination).
   * Admin gets all; runners get their own.
   */
  static async getRegistrations(userId, isAdmin, query = {}) {
    const where = isAdmin ? {} : { userId };
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit) || DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        select: {
          id: true,
          registrationNumber: true,
          eventId: true,
          tier: true,
          subtotal: true,
          taxes: true,
          paymentStatus: true,
          status: true,
          checkInStatus: true,
          certificateStatus: true,
          createdAt: true,
          age: true,
          dob: true,
          idProofUrl: true,
          certificateUrl: true,
          user: { select: { fullName: true, email: true, mobile: true, gender: true } },
          event: { select: { title: true } },
          bib: { select: { bibNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.registration.count({ where }),
    ]);

    const data = registrations.map((r) => ({
      id: r.registrationNumber || r.id.substring(0, 8),
      dbId: r.id,
      firstName: r.user.fullName.split(" ")[0] || "",
      lastName: r.user.fullName.split(" ").slice(1).join(" ") || "",
      email: r.user.email,
      mobile: r.user.mobile || "",
      gender: r.user.gender || "Unknown",
      age: r.age,
      dob: r.dob ? r.dob.toISOString().split("T")[0] : "",
      eventId: r.eventId,
      eventName: r.event.title,
      category: r.tier || "Standard",
      amount: r.subtotal || 0,
      tax: r.taxes || 0,
      currency: "INR",
      paymentStatus: r.paymentStatus === "COMPLETED" ? "paid" : r.paymentStatus.toLowerCase(),
      approval: r.status === "PENDING_APPROVAL" ? "pending" : r.status.toLowerCase(),
      checkIn: r.checkInStatus === "NOT_CHECKED_IN" ? "pending" : r.checkInStatus.toLowerCase().replace("_", "-"),
      certificate: r.certificateStatus.toLowerCase(),
      ticket: r.tier || "standard",
      registeredAt: r.createdAt.toISOString(),
      bib: r.bib?.bibNumber,
      idProofUrl: r.idProofUrl,
      medicalCertUrl: r.certificateUrl
    }));

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Create a new registration and process initial payment order
   */
  static async createRegistration(userId, data, files) {
    const { eventId, tier } = data;
    let participant = data.participant;
    if (typeof participant === "string") {
      try {
        participant = JSON.parse(participant);
      } catch (e) {
        throw new AppError("Invalid participant data", 400);
      }
    }

    const event = await prisma.event.findUnique({ where: { slug: eventId } });
    if (!event) {
      throw new AppError("Event not found", 404);
    }

    // Calculate price on server
    const basePrice = event.price;
    const tierAdd = tier === "vip" ? 2800 : tier === "charity" ? 1500 : 0;
    const subtotal = basePrice + tierAdd;
    const taxes = Math.round(subtotal * 0.18);
    const total = subtotal + taxes;

    if (!participant || !participant.dob) {
      throw new AppError("Participant DOB required", 400);
    }
    const dobDate = new Date(participant.dob);
    let age = new Date().getFullYear() - dobDate.getFullYear();
    const m = new Date().getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < dobDate.getDate())) {
      age--;
    }

    const idProofUrl = files?.idProof?.[0]?.filename ? '/uploads/' + files.idProof[0].filename : null;
    const certificateUrl = files?.certificate?.[0]?.filename ? '/uploads/' + files.certificate[0].filename : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        gender: participant.gender,
        dob: dobDate,
        bloodGroup: participant.bloodGroup,
        emergencyName: participant.emergencyName,
        emergencyPhone: participant.emergencyPhone,
        address: participant.country || "India",
      }
    });

    const registrationNumber = "MM" + Math.random().toString().slice(2, 10);
    const reg = await prisma.registration.create({
      data: {
        registrationNumber,
        userId: userId,
        eventId: event.id,
        tier,
        subtotal,
        taxes,
        total,
        tshirtSize: participant.tshirt || "M",
        dob: dobDate,
        age: age,
        country: participant.country || "India",
        bloodGroup: participant.bloodGroup,
        emergencyName: participant.emergencyName,
        emergencyPhone: participant.emergencyPhone,
        idProofUrl,
        certificateUrl,
        status: "PAYMENT_PENDING"
      }
    });

    const paymentOrderId = "order_" + Math.random().toString().slice(2, 12);

    return {
      orderId: paymentOrderId,
      amount: total,
      registrationId: reg.id,
      registrationNumber
    };
  }

  /**
   * Get a specific registration
   */
  static async getRegistrationById(id, userId, isAdmin) {
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] },
      include: { event: true, bib: true, user: true }
    });

    if (!reg) throw new AppError("Registration not found", 404);

    if (!isAdmin && reg.userId !== userId) {
      throw new AppError("You do not have permission to view this registration", 403);
    }

    return reg;
  }

  /**
   * Update payment status or general info
   */
  static async updateRegistration(id, data, userId, isAdmin) {
    const { paymentStatus } = data;
    
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] }
    });

    if (!reg) throw new AppError("Registration not found", 404);

    if (!isAdmin && reg.userId !== userId) {
      throw new AppError("You do not have permission to update this registration", 403);
    }

    let dataToUpdate = {};
    if (paymentStatus) {
      dataToUpdate.paymentStatus = paymentStatus;
      if (paymentStatus === "COMPLETED") {
        dataToUpdate.status = "CONFIRMED";
      }
    }

    return prisma.registration.update({
      where: { id: reg.id },
      data: dataToUpdate
    });
  }

  /**
   * Update approval status (Admin only)
   */
  static async updateApproval(id, approval) {
    let prismaStatus = "PENDING_APPROVAL";
    if (approval === "approved") prismaStatus = "PAYMENT_PENDING";
    if (approval === "rejected") prismaStatus = "REJECTED";

    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] }
    });

    if (!reg) throw new AppError("Registration not found", 404);

    return prisma.registration.update({
      where: { id: reg.id },
      data: { status: prismaStatus },
    });
  }

  /**
   * Upload documents for existing registration
   */
  static async uploadDocuments(id, files, userId, isAdmin) {
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] }
    });

    if (!reg) throw new AppError("Registration not found", 404);

    if (!isAdmin && reg.userId !== userId) {
      throw new AppError("You do not have permission to upload documents for this registration", 403);
    }

    const dataToUpdate = {};
    if (files?.idProof?.[0]?.filename) {
        dataToUpdate.idProofUrl = '/uploads/' + files.idProof[0].filename;
    }
    if (files?.certificate?.[0]?.filename) {
        dataToUpdate.certificateUrl = '/uploads/' + files.certificate[0].filename;
    }

    if (Object.keys(dataToUpdate).length === 0) {
        throw new AppError("No documents provided for upload", 400);
    }

    return prisma.registration.update({
      where: { id: reg.id },
      data: dataToUpdate
    });
  }

  /**
   * Delete a registration
   */
  static async deleteRegistration(id) {
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] }
    });
    
    if (!reg) throw new AppError("Registration not found", 404);
    
    return prisma.registration.delete({ where: { id: reg.id } });
  }
}
