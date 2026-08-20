export const validate = (schema) => (req, res, next) => {
  try {
    // We only parse the body. For multipart/form-data, req.body comes from multer.
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ 
        success: false, 
        message: err.errors[0].message, 
        errors: err.errors 
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
};
