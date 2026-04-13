const { getConfig, saveConfig } = require('../utils/config');

module.exports = function logout() {
  const { token } = getConfig();

  if (!token) {
    console.log('You are not logged in.');
    return;
  }

  saveConfig({});
  console.log('Logged out successfully.');
};