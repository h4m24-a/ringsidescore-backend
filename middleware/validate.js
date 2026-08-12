const { validationResult } = require("express-validator");

// Drop this after a chain of express-validator checks:
//   router.post('/x', [body('email').isEmail(), ...], validate, controller)
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(422).json({
    message: "Validation failed",
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

module.exports = validate;
