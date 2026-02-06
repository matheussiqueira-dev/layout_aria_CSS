const { validationError } = require("./errors");

function normalizeIssues(issues) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function validate(schema, source = "body") {
  return function validateMiddleware(req, res, next) {
    const value = typeof source === "function" ? source(req) : req[source];
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      return next(validationError(normalizeIssues(parsed.error.issues)));
    }

    if (typeof source === "string") {
      req[source] = parsed.data;
    } else {
      req.validated = parsed.data;
    }

    return next();
  };
}

function validateRequest({ body, query, params }) {
  return function validateRequestMiddleware(req, res, next) {
    if (body) {
      const parsedBody = body.safeParse(req.body);
      if (!parsedBody.success) {
        return next(validationError(normalizeIssues(parsedBody.error.issues)));
      }
      req.body = parsedBody.data;
    }

    if (query) {
      const parsedQuery = query.safeParse(req.query);
      if (!parsedQuery.success) {
        return next(validationError(normalizeIssues(parsedQuery.error.issues)));
      }
      req.query = parsedQuery.data;
    }

    if (params) {
      const parsedParams = params.safeParse(req.params);
      if (!parsedParams.success) {
        return next(validationError(normalizeIssues(parsedParams.error.issues)));
      }
      req.params = parsedParams.data;
    }

    return next();
  };
}

module.exports = {
  validate,
  validateRequest,
};
