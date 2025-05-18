//ch.js made by: Sapekador
//you need to install ws and axios
//npm install ws
//npm install axios

const Axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class Room {
  constructor(bot, name) {
    this.bot = bot;
    this.name = name;
  }

  /**
   * Envia mensagem para a sala.
   * @param {string} text - Texto da mensagem.
   * @param {boolean} html - Se true, envia como HTML.
   */
  message(text, html = false) {
    if (!this.bot.connected) return;
    if (typeof text !== 'string' || text.length === 0) return;

    const now = Date.now();
    if (this.bot.lastMessageTime && now - this.bot.lastMessageTime < this.bot.messageDelay) {
      // Se mandar muito rápido, espera e tenta de novo
      setTimeout(() => this.message(text, html), this.bot.messageDelay);
      return;
    }
    this.bot.lastMessageTime = now;

    const htmlFlag = html ? 'h' : '';
    const msg = `:m:${this.name}:${htmlFlag}:${text}`;
    this.bot.ws.send(msg);
  }
}

class Chatango extends EventEmitter {
  constructor() {
    super();

    this.ws = null;
    this.rooms = {}; // Map de Room
    this.connected = false;
    this.nameColor = '000000'; // cor padrão preta
    this.lastMessageTime = 0;
    this.messageDelay = 1000; // 1s entre mensagens para evitar flood

    this.username = null;
    this.password = null;
    this.roomsToJoin = [];

    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    this.isStopping = false;
  }

  /**
   * Inicia conexão e login com usuário e salas.
   * @param {string} username - Usuário do Chatango.
   * @param {string} password - Senha do Chatango.
   * @param {string[]} rooms - Lista de salas para entrar.
   */
  easy_start(username, password, rooms = []) {
    this.username = username;
    this.password = password;
    this.roomsToJoin = rooms;
    this.isStopping = false;

    this.connect();
  }

  connect() {
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }

    console.log('[Chatango] Conectando...');

    this.ws = new WebSocket('wss://chatango.com/ws');

    this.ws.on('open', () => {
      console.log('[Chatango] Conectado ao servidor');
      this.connected = true;
      this.reconnectAttempts = 0;

      // Login
      this.ws.send(`::log:${this.username}:${this.password}`);

      // Entra nas salas
      for (const room of this.roomsToJoin) {
        this.joinRoom(room);
      }

      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      const msg = data.toString();
      this.handleMessage(msg);
    });

    this.ws.on('close', () => {
      console.log('[Chatango] Desconectado do servidor');
      this.connected = false;
      this.emit('disconnected');
      if (!this.isStopping) this.tryReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[Chatango] Erro no WebSocket:', err);
      this.emit('error', err);
    });
  }

  tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Chatango] Máximo de tentativas de reconexão atingido');
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * this.reconnectAttempts * 2, 30000); // delay crescente até 30s
    console.log(`[Chatango] Tentando reconectar em ${delay / 1000}s... (tentativa ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  joinRoom(roomName) {
    if (this.rooms[roomName]) return; // Já entrou
    this.rooms[roomName] = new Room(this, roomName);
    this.ws.send(`::join:${roomName}`);
    console.log(`[Chatango] Entrando na sala: ${roomName}`);
  }

  leaveRoom(roomName) {
    if (!this.rooms[roomName]) return;
    this.ws.send(`::leave:${roomName}`);
    delete this.rooms[roomName];
    console.log(`[Chatango] Saindo da sala: ${roomName}`);
  }

  handleMessage(msg) {
    if (!msg) return;

    const parts = msg.split(':').filter(Boolean);

    if (parts.length === 0) return;

    const cmd = parts[0];

    switch (cmd) {
      case 'm': {
        // mensagem pública
        if (parts.length < 4) return;
        const roomName = parts[1];
        const userName = parts[2];
        const text = parts.slice(3).join(':');
        if (this.rooms[roomName]) {
          this.emit('Message', this.rooms[roomName], { name: userName }, { text, time: Date.now() });
        }
        break;
      }
      case 'pm': {
        // mensagem privada
        if (parts.length < 3) return;
        const userName = parts[1];
        const text = parts.slice(2).join(':');
        const pm = {
          message: (targetUser, text) => {
            this.ws.send(`:pm:${targetUser}:${text}`);
          }
        };
        this.emit('PrivateMessage', pm, { name: userName }, { text, time: Date.now() });
        break;
      }
      case 'join': {
        if (parts.length < 2) return;
        const roomName = parts[1];
        this.emit('join', this.rooms[roomName]);
        break;
      }
      case 'leave': {
        if (parts.length < 2) return;
        const roomName = parts[1];
        this.emit('leave', this.rooms[roomName]);
        break;
      }
      case 'error': {
        const errorMsg = parts.slice(1).join(':');
        this.emit('error', new Error(errorMsg));
        break;
      }
      case 's': {
        // status ou info (não tratado)
        break;
      }
      default:
        // comando desconhecido, ignora
        break;
    }
  }

  /**
   * Envia uma mensagem privada para um usuário.
   * @param {string} targetUser - Nome do usuário.
   * @param {string} text - Texto da mensagem.
   */
  sendPrivateMessage(targetUser, text) {
    if (!this.connected) return;
    this.ws.send(`:pm:${targetUser}:${text}`);
  }

  /**
   * Para o bot e desconecta.
   */
  stop() {
    this.isStopping = true;
    if (this.ws) this.ws.close();
    this.connected = false;
    console.log('[Chatango] Bot parado');
  }

  /**
   * Desconecta (mesmo que stop).
   */
  disconnect() {
    this.stop();
  }
}

module.exports = { Chatango };
