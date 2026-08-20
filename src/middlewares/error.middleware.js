export function errorHandler(err, req, res, next) {
  console.error("🔥 Error Handler Caught Exception:", err);

  // Prisma unique constraint violation error code P2002
  if (err.code === "P2002") {
    const target = err.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(", ") : err.meta.target) : "field";
    return res.status(400).json({
      success: false,
      message: `A record with this ${target} already exists.`,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API Route Not Found - ${req.originalUrl}`,
  });
}
