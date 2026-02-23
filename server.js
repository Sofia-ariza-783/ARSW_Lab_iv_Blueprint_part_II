import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const blueprints = new Map();

const createResponse = (code, message, data) => ({
  code,
  message,
  data
});

app.get('/api/v1/blueprints', (req, res) => {
  const allBlueprints = Array.from(blueprints.values());
  res.json(createResponse(200, "execute ok", allBlueprints));
});

app.get('/api/v1/blueprints/:author', (req, res) => {
  const authorBlueprints = Array.from(blueprints.values())
    .filter(bp => bp.author === req.params.author);

  if (authorBlueprints.length === 0) {
    return res.status(404).json(createResponse(404, "No blueprints found for the given author", null));
  }

  res.json(createResponse(200, "execute ok", authorBlueprints));
});

app.get('/api/v1/blueprints/:author/:bpname', (req, res) => {
  const key = `${req.params.author}:${req.params.bpname}`;
  const blueprint = blueprints.get(key);

  if (!blueprint) {
    return res.status(404).json(createResponse(404, "Blueprint not found", null));
  }

  res.json(createResponse(200, "execute ok", blueprint));
});

app.post('/api/v1/blueprints', (req, res) => {
  const { author, name, points } = req.body;

  if (!author || !name) {
    return res.status(400).json(createResponse(400, "Validation error: author and name are required", null));
  }

  const key = `${author}:${name}`;

  if (blueprints.has(key)) {
    return res.status(403).json(createResponse(403, "Blueprint already exists", null));
  }

  const blueprint = {
    author,
    name,
    points: points || []
  };

  blueprints.set(key, blueprint);
  res.status(201).json(createResponse(201, "Blueprint created successfully", null));
});

app.put('/api/v1/blueprints/:author/:bpname/points', (req, res) => {
  const { x, y } = req.body;
  const key = `${req.params.author}:${req.params.bpname}`;
  const blueprint = blueprints.get(key);

  if (!blueprint) {
    return res.status(404).json(createResponse(404, "Blueprint not found", null));
  }

  blueprint.points.push({ x, y });
  blueprints.set(key, blueprint);

  res.status(202).json(createResponse(202, "Point added successfully", null));
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join-room', (room) => socket.join(room));
  socket.on('draw-event', ({ room, point, author, name }) => {
    const key = `${author}:${name}`;
    const blueprint = blueprints.get(key) || {
      author,
      name,
      points: []
    };
    blueprint.points.push(point);
    blueprints.set(key, blueprint);

    socket.to(room).emit('blueprint-update', { author, name, points: [point] });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Socket.IO up on :${PORT}`));
