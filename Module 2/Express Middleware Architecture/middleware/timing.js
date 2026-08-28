function timing(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const id = req.id ? `[${req.id.slice(0, 8)}] ` : '';

    console.log(`${id}${req.method} ${req.path} took ${ms}ms`);
  });

  next();
}

module.exports = timing;