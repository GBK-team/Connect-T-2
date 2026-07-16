module.exports = {
  apps: [
    {
      name: "connect-t-backend",
      cwd: __dirname,
      script: "hostinger-entry.js",
      instances: 1,
      exec_mode: "fork",
      watch: false
    }
  ]
};
