const SlackBot = require('slackbots');
const yaml = require('yaml')
const fs = require('fs');
const code = require('./code');

let file = fs.readFileSync('conf.yml', 'utf8')
let config = yaml.parse(file)

// create a bot
// Add a bot https://my.slack.com/services/new/bot and put the token 
let bot = new SlackBot({
    token: config.bot.token,
    name: config.bot.name,
    proxy: config.proxy
});

bot.on('start', function () {
    
});

bot.on('message', function (data) {
    console.log(data)

    let message = data
    try {
        let res = parseMessage(message)
        if (res.isAtMe && res.command == SMS) {
            code.fetchCode("uk", res.ending, config.user.username, config.user.password, config.proxy).then((text) => {
                sendMessageTo(message.channel, `<@${message.user}> ` + text, message.ts);
            }).catch((err) => {
                sendMessageTo(message.channel, `<@${message.user}> ` + err.message, message.ts);
            })
        }

    } catch (error) {
        console.log(error)
    }
});

async function sendMessageTo(channel, message, thread) {

    bot.postMessage(channel, message, {
        thread_ts: thread
    }, (res) => {
        console.log(res)
    });
}

let MeID = '<@U02NT086QHE> '
let SMS = 1
let NONE = 0

function parseMessage(message) {

    let text = message.text
    if (text == null) {
        return {
            isAtMe: false,
            command: NONE,
        }
    }
    let isAtMe = text.startsWith(MeID)
    let rest = text.replace(MeID, '')
    let isSMS = false
    let ending = ""

    if (rest.startsWith('sms/')) {
        isSMS = true
        ending = rest.replace('sms/', '')
    } else if (rest == "sms") {
        isSMS = true
    }
    return {
        isAtMe: isAtMe,
        command: isSMS ? SMS : NONE,
        parameters: {
            ending: ending
        }
    }
}