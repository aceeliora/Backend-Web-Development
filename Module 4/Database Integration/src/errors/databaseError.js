function safeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}

function toSafeDatabaseError(error) {
  switch (error && error.code) {
    case 'P2002':
      return safeError('A record with those details already exists', 409);
    case 'P2003':
    case 'P2011':
    case 'P2014':
      return safeError('Related record does not exist or the submitted data is invalid', 422);
    case 'P1000':
    case 'P1001':
    case 'P1002':
    case 'P1017':
      return safeError('Database is temporarily unavailable', 503);
    default:
      return safeError('Database request failed', 500);
  }
}

module.exports = { safeError, toSafeDatabaseError };
