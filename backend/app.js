const path = require('path'); 
require('dotenv').config({ path: path.join(__dirname, '.env') });
const package = require('./package.json');
const express = require('express');
const app = express();
const cors = require('cors');
const logger = require('morgan');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const { allowed_origins } = require('./config');
const { log_socket_event } = require('./utils');

const io = new Server(server, {
  path: '/chatbot/',
  cors: {
      origin: allowed_origins
  }
});
const chatbot = io.of('/chatbot');
global.chatbot = chatbot;

const { verify_key } = require('./auth');
const { create_chat, ask_chat, speak_chat } = require('./chatbot')(chatbot);

if (process.env.NODE_ENV !== 'prod') app.use(logger('dev'));
else app.use(logger('combined'));

app.use(express.json({ limit: '5mb' }));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowed_origins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(origin, 'Not allowed by CORS.'));
    }
}));

app.get('/', (_, res) => res.json({ message: 'Hello world!' }));
app.get('/version', (_, res) => res.json({ version: package.version }));
app.get('/chatbot', (_, res) => res.json({ message: 'Hi from GastroGuru!' }));
app.use((_, res) => res.status(404).send('Bad URL'));

chatbot.use(verify_key);

chatbot.use((socket, next) => {
    const originalEmit = socket.emit;

    // Override the emit function
    socket.emit = function(event, ...args) {
        log_socket_event(socket, event, args[0]);
        originalEmit.apply(socket, [event, ...args]);
    };

    // Log incoming events
    socket.onAny((event, ...args) => {
        log_socket_event(socket, event, args[0]);
    });

    next();
});

chatbot.on('connection', socket => {
    socket.on('chat:create', create_chat);
    socket.on('chat:ask', ask_chat);
    socket.on('chat:speak', speak_chat);
});

server.listen(3001, console.log(`Running on port 3001. Env ${process.env.NODE_ENV}`));