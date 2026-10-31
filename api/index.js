const { app, startServer } = require('../backend/server');

module.exports = async (req, res) => {
  await startServer();
  return app(req, res);
};

