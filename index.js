const SlackBot = require('slackbots');
const yaml = require('yaml')
const fs = require('fs')
const axios = require('axios').default;
const FormData = require("form-data");

let file = fs.readFileSync('conf.yml', 'utf8')
let config = yaml.parse(file)

// create a bot
// Add a bot https://my.slack.com/services/new/bot and put the token 
let bot = new SlackBot({
    token: config.bot.token,
    name: config.bot.name,
    proxy: config.proxy
});

bot.on('start', async function () {
    try {
        await sendFileToUser(bot.token, "U1W9F9Z6Z", "/Users/Darcy/Desktop/Icon.png", {})
    } catch (error) {
        console.log(error)
    }
});

bot.on('message', async function (data) {
    let parsed = parseMessage(data)
    if (parsed && parsed.isAtMe && parsed.message != null) {
        sendMessageTo(data.channel, `<@${data.user}> ` + parsed.message, data.ts)
    }
});

let NONE = 0
let SMS = 1

function parseMessage(message) {

    let MeID = `<@${bot.self.id}> `
    let text = message.text
    if (text == null) {
        return {
            isAtMe: false,
            command: NONE,
            message: null
        }
    }
    let isAtMe = text.startsWith(MeID)
    let rest = text.replace(MeID, '')
    return {
        isAtMe: isAtMe,
        message: rest,
        command: NONE
    }
}

async function sendMessageTo(channel, message, thread) {
    bot.postMessage(channel, message, {
        thread_ts: thread
    }, (res) => {
        console.log(res)
    })
}

async function sendFileToUser(token, channelId, file) {

    const form = new FormData();
    form.append("token", token);
    form.append("channels", channelId);
    form.append("file", fs.createReadStream(file), 'Upload By Bot');
    
    try {
        const res = await axios.post("https://slack.com/api/files.upload", form, {
            headers: form.getHeaders(),
        });
        console.log(res)
    } catch (err) {
        console.log(err)
    }
}