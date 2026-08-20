import { RegistrationService } from "../services/registration.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/apiResponse.js";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];

export class RegistrationController {
  
  static getAll = catchAsync(async (req, res) => {
    const isAdmin = req.user.roleName && ADMIN_ROLES.includes(req.user.roleName);
    const result = await RegistrationService.getRegistrations(req.user.id, isAdmin, req.query);
    res.json({
      success: true,
      message: "Registrations retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  });

  static create = catchAsync(async (req, res) => {
    const result = await RegistrationService.createRegistration(req.user.id, req.body, req.files);
    sendResponse(res, 201, "Registration created successfully", result);
  });

  static getById = catchAsync(async (req, res) => {
    const isAdmin = req.user.roleName && ADMIN_ROLES.includes(req.user.roleName);
    const data = await RegistrationService.getRegistrationById(req.params.id, req.user.id, isAdmin);
    sendResponse(res, 200, "Registration retrieved successfully", data);
  });

  static update = catchAsync(async (req, res) => {
    const isAdmin = req.user.roleName && ADMIN_ROLES.includes(req.user.roleName);
    const data = await RegistrationService.updateRegistration(req.params.id, req.body, req.user.id, isAdmin);
    sendResponse(res, 200, "Registration updated successfully", data);
  });

  static updateApproval = catchAsync(async (req, res) => {
    const data = await RegistrationService.updateApproval(req.params.id, req.body.approval);
    sendResponse(res, 200, "Approval status updated", data);
  });

  static uploadDocuments = catchAsync(async (req, res) => {
    const isAdmin = req.user.roleName && ADMIN_ROLES.includes(req.user.roleName);
    const data = await RegistrationService.uploadDocuments(req.params.id, req.files, req.user.id, isAdmin);
    sendResponse(res, 200, "Documents uploaded successfully", data);
  });

  static delete = catchAsync(async (req, res) => {
    await RegistrationService.deleteRegistration(req.params.id);
    sendResponse(res, 200, "Registration deleted successfully");
  });
}
