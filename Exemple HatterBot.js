const { Chatango } = require('./ch');
const Bot = new Chatango();
const axios = require('axios');  // Import axios
const fetch = require('node-fetch');
const yts = require('youtube-search');
const ytOpts = {
  maxResults: 1,
  key: 'YOUR YT API KEY'
};

Bot.easy_start("yourbotname", "yourbotpassworld", ["room1", "room2"]);   
Bot.nameColor = "f00";

var owner = "owner acc/your main acc" 
var prefix = "/" //prefix bot ex: /help, /youtube

Bot.on('PrivateMessage', (pm, user, message) => {
    console.log("PM", user.name, message.text, message.time);
    pm.message(user.name, message.text);
});
    
Bot.on('Message', (room, user, message) => {
    
    console.log(room.name, user.name, message.text)
    if (message.text==="good morning"){
      room.message(`morning motherfucker <u>xD</u> ${user.name}`, true)
    }
        
    if (message.text[0] === prefix){
        var [cmd, ...args] = message.text.slice(1).split(" ");
        args = args.join(" ");
    }

      // Comando !help
      if (cmd === 'help' || cmd === 'cmds' || cmd === 'commands') {
        const language = args || 'en';  //
        const currentTime = Date.now();

      else if (language === 'en') {
          room.message(`**Available Commands:**
          /youtube [term] - Search for videos on YouTube.
          /img [term] - Search for images on Google.
          /rooms - Shows the chats where the bot is.
          /e - Ex: 2 + 2 = 4.`);
      }

     if (cmd === 'youtube' && args) {
        yts(args, ytOpts, (err, results) => {
          if (err) {
            room.message('Erro ao buscar no YouTube.');
          } else {
            const video = results[0];
            room.message(`Título: ${video.title}\nLink: ${video.link}`);
          }
        });
      }

    if (cmd === 'img' && args) {
        axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(args)}&searchType=image&key=YOUR GOOGLE API KEY`)
          .then(response => {
            const items = response.data.items;
            
            // Verifica se há imagens retornadas
            if (items && items.length > 0) {
              // Limita a quantidade de imagens para 1 ou 2
              const imagesToSend = items.slice(0, 2); // Pode mudar o número aqui (1 ou 2)
              
              imagesToSend.forEach(item => {
                // Envia a URL da imagem
                room.message(`**Imagem:**\n${item.link}`);
              });
            } else {
              room.message('❗ **Nenhuma imagem encontrada para essa busca.**');
            }
          })
          .catch(error => {
            console.error('Erro ao buscar imagens:', error);
            room.message('❌ **Erro ao buscar imagens.**');
          });
      }
  
    if (cmd==="rooms"){
        var orl = Object.keys(Bot.rooms),
        rl = orl.join(', '),
        sz = orl.length;
        room.message(`im in ${sz} room(s): ${rl}`)
       };
    
    if (user.name.toLowerCase() === owner){
      
      if (cmd==="leave"){room.disconnect()};
      if (cmd==="stop"){Bot.stop()};
      
      if (cmd === "e"){ 
            try{
                var ret = eval(args);
                room.message(ret);
            }
            catch(err){
                err = err.stack.trim();
                err = err.split("\n");
                err = err.slice(0, 3);
                room.message(err.join("\r"));
            }
       }
    }
});
