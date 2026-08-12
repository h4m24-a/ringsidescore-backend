// Avoids try/catch boilerplate in every controller — wrap the handler and
// any rejected promise gets forwarded to the error-handling middleware.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
