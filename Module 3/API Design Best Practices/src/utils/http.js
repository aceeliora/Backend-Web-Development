function sendSuccess(res, data, status = 200, meta) {
  const body = { data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function sendError(res, status, code, message) {
  return res.status(status).json({
    error: {
      code,
      message
    }
  });
}

module.exports = {
  sendSuccess,
  sendError
};
