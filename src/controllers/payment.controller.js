import { PaymentService } from "../services/payment.service.js";

export class PaymentController {
  static async getAll(req, res, next) {
    try {
      const data = await PaymentService.getAllPayments();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async webhook(req, res, next) {
    try {
      // Data is already validated by the middleware
      const result = await PaymentService.handleWebhook(req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      if (err.message === "Registration not found") {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}
