const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let currentPrice = 0;
let currentUser = null;
let auctionTimer = null;
let timerSeconds = 15;
let timeLeft = timerSeconds;
let auctionInProgress = false;
let lastBidder = null;
let auctionHistory = [];
let currentPlayer = null;

io.on('connection', (socket) => {
  console.log('Nuovo client connesso');

  socket.emit('updateState', {
    currentPrice,
    currentUser,
    timeLeft,
    auctionInProgress,
    currentPlayer,
    auctionHistory,
  });

  socket.on('bid', ({ amount, user }) => {
    if (!auctionInProgress) {
      socket.emit('bidRejected', 'Non c\'è un\'asta in corso.');
      return;
    }
    if (user === lastBidder) {
      socket.emit('bidRejected', 'Non puoi rilanciare la tua stessa puntata consecutivamente.');
      return;
    }
    if (amount <= 0) return;

    currentPrice += amount;
    currentUser = user;
    lastBidder = user;
    timeLeft = timerSeconds;

    io.emit('updatePrice', { price: currentPrice, user: currentUser });

    if (auctionTimer) clearInterval(auctionTimer);
    auctionTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(auctionTimer);
        auctionInProgress = false;
        auctionHistory.push({
          player: currentPlayer,
          winner: currentUser,
          price: currentPrice,
        });
        io.emit('auctionEnded', {
          winner: currentUser,
          price: currentPrice,
          player: currentPlayer,
          auctionHistory,
        });
        currentPlayer = null;
        currentPrice = 0;
        currentUser = null;
        lastBidder = null;
        timeLeft = timerSeconds;
      } else {
        io.emit('timerUpdate', timeLeft);
      }
    }, 1000);
  });

  socket.on('startAuction', ({ playerName }) => {
    if (auctionInProgress) {
      socket.emit('startRejected', 'Asta già in corso, termina prima quella.');
      return;
    }
    if (!playerName || playerName.trim() === '') {
      socket.emit('startRejected', 'Inserisci un nome giocatore valido.');
      return;
    }
    currentPlayer = playerName.trim();
    currentPrice = 0;
    currentUser = null;
    lastBidder = null;
    auctionInProgress = true;
    timeLeft = timerSeconds;

    io.emit('auctionStarted', { player: currentPlayer });
    io.emit('updatePrice', { price: currentPrice, user: currentUser });

    if (auctionTimer) clearInterval(auctionTimer);
    auctionTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(auctionTimer);
        auctionInProgress = false;
        auctionHistory.push({
          player: currentPlayer,
          winner: currentUser,
          price: currentPrice,
        });
        io.emit('auctionEnded', {
          winner: currentUser,
          price: currentPrice,
          player: currentPlayer,
          auctionHistory,
        });
        currentPlayer = null;
        currentPrice = 0;
        currentUser = null;
        lastBidder = null;
        timeLeft = timerSeconds;
      } else {
        io.emit('timerUpdate', timeLeft);
      }
    }, 1000);
  });
});

const PORT = 3000;
http.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));






