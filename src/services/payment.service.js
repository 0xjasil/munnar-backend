import prisma from "../config/db.js";

export class PaymentService {
  /**
   * Get all payments (Admin only)
   */
  static async getAllPayments() {
    const payments = await prisma.payment.findMany({
      include: {
        user: true,
        registration: {
          include: {
            event: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    
    return payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      user: {
        name: p.user.fullName,
        email: p.user.email,
      },
      event: p.registration?.event?.title || "N/A",
      amount: p.amount,
      status: p.status.toLowerCase(),
      method: p.paymentMethod,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /**
   * Handle payment webhook
   */
  static async handleWebhook(data) {
    const { registrationId, status } = data;
    
    // In a real app, verify the signature here using Razorpay/Stripe SDK
    
    const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new Error("Registration not found");

    // Idempotency check: if already confirmed, ignore
    if (reg.status === "CONFIRMED" && reg.paymentStatus === "COMPLETED") {
      return { message: "Already processed" };
    }

    if (status === "SUCCESS") {
      // 1. Create the Payment record
      await prisma.payment.create({
        data: {
          userId: reg.userId,
          registrationId: reg.id,
          invoiceId: "INV-" + Math.random().toString().slice(2, 8),
          amount: reg.total,
          status: "COMPLETED",
          paymentMethod: "Razorpay"
        }
      });

      // 2. Update Registration
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          paymentStatus: "COMPLETED",
          status: "CONFIRMED"
        }
      });
      
      return { message: "Payment successful" };
    } else {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { paymentStatus: "FAILED" }
      });
      return { message: "Payment failed marked" };
    }
  }
}
