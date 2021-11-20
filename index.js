const SlackBot = require('slackbots');
const yaml = require('yaml')
const fs = require('fs')
const axios = require('axios').default;

let file = fs.readFileSync('conf.yml', 'utf8')
let config = yaml.parse(file)

// create a bot
// Add a bot https://my.slack.com/services/new/bot and put the token 
let bot = new SlackBot({
 token: config.bot.token,
 name: config.bot.name
});

bot.on('start', function () {
 bot.postMessageToChannel(config.channels.notified, 'I am working right now!');
});

bot.on('message', async function (data) {
 console.log(data)
 try {
  let response = await axios.get(config.bot.url, data)
  bot.postMessageToChannel(config.channels.posted, response.data);
 } catch (error) {
  console.log(error)
 }
});