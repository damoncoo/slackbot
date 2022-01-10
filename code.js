const request = require('request');
const Vow = require("Vow")
const CryptoJS = require("crypto-js")

let entityMapping = {
    "uk": "uk",
    "msb": "uk"
}

function searchMapping(phoneEnding, entity) {
    if (entity == "msb") {
        return `search index=*mAuth* "List=*${phoneEnding}" Text="*"  | rex field=_raw "(?ms)^(?P<DateTime>\\d+\\-\\d+\\-\\d+\\s+\\d+:\\d+:\\d+\\.\\d+)" | rex field=_raw "^(?:[^\\]\\n]*\\])*\\s+\\w+=(?P<Number>\\+\\d+)"`
    } else if (entity == "uk") {
        return `search index = digital_dsp_ukrb_transmit_raw hsbc_dsp_u31488.sms Text=* "List=*${phoneEnding}"`
    }
}

async function fetchCode(entity, ending, user, password, proxy) {

    let phoneEnding = "0000"
    if (ending != null) {
        phoneEnding = ending
    }

    let en = entity || "msb"
    let pj = entityMapping[en]
    let search = searchMapping(phoneEnding, en)

    let url = `https://digital-search.dtme-splunk.euw1.dev.aws.cloud.hsbc:8089/servicesNS/${user}/dsp_${pj}/search/jobs`
    let data = {
        url: url,
        proxy: proxy,
        form: {
            "search": search,
            "exec_mode": "oneshot",
            "output_mode": "json",
            "id": `dsp_${pj}${user}`,
            "earliest_time": "-60m"
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
                let message = analyzeCode(body)
                resolve(message)
            } catch (e) {
                resolve(e);
            }
        });
    });
}

module.exports.fetchCode = fetchCode


function analyzeCode(jsonData) {

    let results = jsonData.results
    if (results.length > 0) {
        let found = []
        for (let result of results) {
            let message = process(result.Text, getTime(result), getNumber(result));
            if (message != null) {
                found.push(message)
            }
        }
        if (found.length > 0 ) {
            return `Found ${found.length} in last 15m \n` + found.join("\n")
        }
        throw new Error("No results found in last 15m")
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
    return Number
}

function process(text, time, number) {
    if (text.length <= 0) {
        throw new Error(" 'text' can not be empty !!")
    } else {
        try {
            var wordArray = CryptoJS.enc.Base64.parse(text);
            var decodedString = CryptoJS.enc.Utf8.stringify(wordArray);
            const output = "" + time + " ---- " + number + " ---- " + decodedString;
            return output
        } catch (e) {
            return null
        }
    }
}


