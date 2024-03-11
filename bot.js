const server = require('./server');
const dotenv = require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const TeachableMachine = require("@sashido/teachablemachine-node");
const fs = require("fs");
var jokesJson = require('./piadas/trocadilhos.json');
const model = new TeachableMachine({ modelUrl: "http://localhost:3000/model/" });
const IMAGES_DIR = "./images";
const LOCALHOST_PORT = 3000;
const LOCALHOST_PATH = `http://localhost:${LOCALHOST_PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));


//---------------------------------------------------------
//-------- Inicia Localhost -------------------------------
//---------------------------------------------------------

server.startServer(LOCALHOST_PORT).then(onServerStarted);
function onServerStarted() {
        //metodo disparado ao localhost ser inicializado
        //não faça nada por enquanto
}


//---------------------------------------------------------
//-------- Atributos do Bot -------------------------------
//---------------------------------------------------------

const telegramToken = process.env.TELEGRAM_API_KEY;
const bot = new TelegramBot(telegramToken, { polling: true });
var activeChatIdsList = [""];

//---------------------------------------------------------
//-------- Configura os comandos --------------------------
//---------------------------------------------------------

var commands = [
        { command: "/classificar", description: "Classificar imagem" },
        { command: "/piada", description: "Me conte uma piada" },
        { command: "/presente", description: "Quero um presente" }
];
//bot.deleteMyCommands(); //utilize para limpar os comandos
bot.setMyCommands(commands);


//---------------------------------------------------------
//-------- Configura evento de mensagem recebida ----------
//---------------------------------------------------------

bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const messageText = msg.text;

        if (activeChatIdsList.includes(chatId)) //ignora e deleta a mensagem se estiver processando algo
        {
                bot.deleteMessage(chatId, msg.message_id);
                return;
        }

        if (msg.photo) {
                activeChatIdsList.push(chatId);

                bot.sendMessage(chatId, "Processando imagem...");

                createDirectory(IMAGES_DIR); //cria diretório de imagens se ainda não existe

                const photoId = msg.photo[msg.photo.length - 1].file_id;
                bot.downloadFile(photoId, IMAGES_DIR).then((imgPath) => {
                        getUploadedPhoto(imgPath, chatId);
                });
        }
        else if (messageText === '/classificar') {
                bot.sendMessage(chatId, "Envie uma imagem para que eu possa classificar.");
        }
        else if (messageText === '/piada') {
                activeChatIdsList.push(chatId);

                enviarPiada(chatId);
        }
        else if (messageText === '/presente') {
                bot.sendMessage(chatId, "Jogue este incrível jogo e seja feliz: https://play.google.com/store/apps/details?id=com.pradostudios.toonchase&hl=pt_BR&gl=US");
        }
        else { //mensagem nao reconhecida
                bot.sendMessage(chatId, "Seja bem vindo ao TeleBot FAESA. Diga-me o quê queres.\n(digite '/' para ver as opções)");
        }

});


//---------------------------------------------------------
//-------- Trata foto recebida pelo usuário ---------------
//---------------------------------------------------------

async function getUploadedPhoto(imgPath, chatId) {
        //1- Envia a mesma imagem de volta usando o arquivo salvo localmente
        //console.log(imgPath);
        const stream = fs.createReadStream(imgPath);
        const fileOptions = {
                filename: 'photo',
                contentType: 'image/jpeg',
        };
        bot.sendPhoto(chatId, stream, {}, fileOptions).then((message) => {
                //console.log(message);
                //2- Envia a foto para análise no modelo de IA        
                const imgFullPath = LOCALHOST_PATH + stream.path;
                console.log("Image full path: " + imgFullPath);
                classifyImage(chatId, imgFullPath);
        });
}


//---------------------------------------------------------
//-------- Classifica imagem utilizando modelo ------------
//---------------------------------------------------------

function classifyImage(chatId, imgUrl) {
        model.classify({
                imageUrl: imgUrl,
        }).then((predictions) => {
                onImagePredictionCompleted(chatId, predictions);
        }).catch((e) => {
                console.log("ERROR", e);
                removeChatId(chatId);
        });
}

function onImagePredictionCompleted(chatId, predictions) {
        console.log("Predictions:", predictions);
        var mensagem = getTextFromPredictions(predictions);
        console.log(mensagem);
        bot.sendMessage(chatId, mensagem).then(() => { removeChatId(chatId); });
}

function getTextFromPredictions(predictions) {
        var text = "Classificação da imagem: \n";
        predictions.forEach(element => {
                var name = element.class;
                var porcentagem = (element.score * 100).toFixed(2) + "%";
                text += `${name} ------ ${porcentagem} \n`;
        });
        return text;
}


//---------------------------------------------------------
//-------- Gera piada aleatória ---------------------------
//---------------------------------------------------------

async function enviarPiada(chatId) {
        var piadaObject = getRandomJoke();
        bot.sendMessage(chatId, piadaObject.pergunta);
        await sleep(1000);
        bot.sendMessage(chatId, "...");
        await sleep(piadaObject.pergunta.length * 80);
        bot.sendMessage(chatId, piadaObject.resposta).then(() => { removeChatId(chatId); });
}

function getRandomJoke() {
        const values = Object.values(jokesJson);
        const randIndex = Math.floor(Math.random() * values.length)
        const randomValue = values[randIndex];
        console.log(randomValue);
        return randomValue;
}


//---------------------------------------------------------
//-------- Utilidades -------------------------------------
//---------------------------------------------------------
function removeChatId(endedChatId){
        const indexOf = activeChatIdsList.indexOf(endedChatId);
        if(indexOf < 0) return;

        activeChatIdsList.splice(indexOf, 1);
}

function createDirectory(dir) {
        if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
        }
}

function testClassifyImage() {
        const imgTest = "images/file_0.jpg";
        const imgFullPath = "http://localhost:3000/" + imgTest;
        classifyImage(imgFullPath);
}
