const request = require('request');
const Vow = require("Vow")
const CryptoJS = require("crypto-js")

let projectMapping = {
    "uk": "uk",
    "msb": "uk",
    "in": "uk"
}

function searchMapping(phoneEnding, entity) {
    if (entity == "msb") {
        return `search index=*mAuth* "List=*${phoneEnding}" Text="*"  | rex field=_raw "(?ms)^(?P<DateTime>\\d+\\-\\d+\\-\\d+\\s+\\d+:\\d+:\\d+\\.\\d+)" | rex field=_raw "^(?:[^\\]\\n]*\\])*\\s+\\w+=(?P<Number>\\+\\d+)"`
    } else if (entity == "uk") {
        return `search index = digital_dsp_ukrb_transmit_raw hsbc_dsp_u31488.sms Text=* "List=*${phoneEnding}"`
    } else if (entity == "in") {
        return `search index=*india_mAuth* "List=*${phoneEnding}"`
    }
    return `search Text=* "List=*${phoneEnding}"`
}

function textMaping(entity) {
    let text = 'Text'
    let raw = '_raw'
    let raws = [
        'in'
    ]
    if (raws.indexOf(entity) != -1) {
        return raw
    }
    return text
}

let minutes = '60m'

async function fetchCode(entity, ending, user, password, proxy) {

    let phoneEnding = "0000"
    if (ending != null) {
        phoneEnding = ending
    }

    let en = entity
    let pj = projectMapping[en]
    let search = searchMapping(phoneEnding, en)
    let keyMapping = textMaping(entity)

    let url = `https://digital-search.dtme-splunk.euw1.dev.aws.cloud.hsbc:8089/servicesNS/${user}/dsp_${pj}/search/jobs`
    let data = {
        url: url,
        proxy: proxy,
        form: {
            "search": search,
            "exec_mode": "oneshot",
            "output_mode": "json",
            "id": `dsp_${pj}${user}`,
            "earliest_time": "-" + minutes
        },
        auth: {
            user: user,
            password: password
        }
    }
    return new Vow.Promise(function (resolve, reject) {

        request.post(data, function (err, request, body) {
            if (err) {
                reject(err);
                return false;
            }
            try {
                body = JSON.parse(body);
                let message = analyzeCode(keyMapping, body)
                resolve(message)
            } catch (e) {
                resolve(e);
            }
        });
    });
}

module.exports.fetchCode = fetchCode


function analyzeCode(keyMapping, jsonData) {

    let results = jsonData.results
    if (results.length > 0) {
        let found = []
        for (let result of results) {
            let message = process(result[keyMapping], getTime(result), getNumber(result));
            if (message != null) {
                found.push(message)
            }
        }
        if (found.length > 0) {
            return `Found ${found.length} in last ${minutes} \n` + found.join("\n")
        }
        throw new Error(`No results found in last ${minutes}`)
    } else {
        throw new Error("No results found")
    }
}

function getTime(result) {
    let _indextime = Number(result._indextime) * 1000
    let d = new Date(_indextime)
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
}

function getNumber(result) {
    let Number = result.Number
    if (Number != null) {
        return Number
    }
    let _raw = result._raw || ''
    let phoneR = /(?<=(List=))\+[0-9]{1,}/
    let results = _raw.match(phoneR)
    try {
        Number = results[0]
    } catch (error) {
    }
    return Number || 'Unknown number'
}

function decodeBase64(text) {
    let decoded = null
    try {
        var wordArray = CryptoJS.enc.Base64.parse(text);
        decoded = CryptoJS.enc.Utf8.stringify(wordArray);
    } catch (error) {
    }
    return decoded
}

function process(text, time, number) {
    if (text.length <= 0) {
        throw new Error(" 'text' can not be empty !!")
    } else {
        try {
            let reg = /Text/
            var decodedString = ''
            if (reg.test(text)) {
                decodedString = text.match(/(?<=\nText=).*(?=\n)/)[0]
                let decoded = decodeBase64(decodedString)
                if (decoded != null) {
                    decodedString = decoded
                }
            } else {
                decodedString = decodeBase64(text)
            }
            if (decodedString == null || decodedString == undefined) {
                return null
            }
            const output = "" + time + " ---- " + number + " ---- " + decodedString;
            return output
        } catch (e) {
            return null
        }
    }
}


