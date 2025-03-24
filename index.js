const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors()); // Optional: for extra API endpoints if you add any

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or restrict to your GitHub Pages domain
    methods: ["GET", "POST"]
  }
});

// In-memory store
let players = {}; // { socketId: { name, score } }
let questions = [];
let currentIndex = 0;
let currentQuestion = null;

// Fetch trivia questions from Open Trivia DB
const fetchQuestions = async () => {
  const url = "https://opentdb.com/api.php?amount=5&type=multiple";
  const res = await axios.get(url);
  questions = res.data.results;
  currentIndex = 0;
  console.log("✅ Questions loaded");
};

// Send next question to all clients
const sendNextQuestion = () => {
  if (currentIndex < questions.length) {
    const q = questions[currentIndex];
    const allAnswers = [...q.incorrect_answers, q.correct_answer];
    allAnswers.sort(() => Math.random() - 0.5);

    currentQuestion = {
      question: q.question,
      correctAnswer: q.correct_answer,
      answers: allAnswers,
    };

    io.emit("new-question", currentQuestion);
    currentIndex++;
  } else {
    io.emit("game-over", players);
  }
};

// Handle socket connection
io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id);

  socket.on("player-joined", (name) => {
    players[socket.id] = { name, score: 0 };
    console.log(`👤 ${name} joined`);
    io.emit("players-updated", players);
  });

  socket.on("submit-answer", (answer) => {
    if (currentQuestion && answer === currentQuestion.correctAnswer) {
      if (players[socket.id]) {
        players[socket.id].score += 1;
      }
    }
    io.emit("players-updated", players);
  });

  socket.on("start-game", async () => {
    await fetchQuestions();
    sendNextQuestion();
  });

  socket.on("next-question", () => {
    sendNextQuestion();
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    delete players[socket.id];
    io.emit("players-updated", players);
  });
});

// Start server (Render uses process.env.PORT)
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Trivia Socket Server running on port ${PORT}`);
  });



  
