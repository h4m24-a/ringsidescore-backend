// Catches anything passed to next(err) from controllers, plus thrown errors
// in async route handlers (see asyncHandler.js). Keep this the LAST
// app.use() in app.js.
function errorHandler(err, req, res, next) {
  console.error(err);

  // Prisma unique constraint violation (e.g. duplicate email)
  if (err.code === "P2002") {
    return res.status(409).json({ message: `A record with that ${err.meta?.target?.join(", ")} already exists` });
  }

  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong" : err.message;
  res.status(status).json({ message });
}

module.exports = errorHandler;
