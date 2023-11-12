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
const { allowed_origins, initial_message } = require('./config');
const io = new Server(server, {
  path: '/chatbot/',
  cors: {
      origin: allowed_origins
  }
});
const chatbot = io.of('/chatbot');
global.chatbot = chatbot;

const { verify_key } = require('./auth');
const { ask } = require('./chatbot');

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

chatbot.on('connection', socket => {
    socket.on('chat:create', chat_id => {
        socket.join(chat_id);
        socket.on('chat:ask', async msg => ask(socket, chat_id, msg));
        chatbot.to(chat_id).emit('chat:create', initial_message);
    });
});

server.listen(3001, console.log(`Running on port 3001. Env ${process.env.NODE_ENV}`));