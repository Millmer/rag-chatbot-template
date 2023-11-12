module.exports = {
  apps: [
    {
      name: 'chatbot',
      script: 'app.js',
      cwd: 'chatbot',
      watch: ['chatbot'],
      ignore_watch: ['/chatbot/node_modules'],
      autorestart: true,
      post_update: ["npm install"]
    },
  ],
};