const request = require('request');
const Vow = require("Vow")
const CryptoJS = require("crypto-js")

async function fetchCode(project, ending, user, password, proxy) {

    let phoneEnding = "0000"
    if (ending != null) {
        phoneEnding = ending
    }

    let pj = "uk"
    if (project != null) {
        pj = project
    }

    let url = `https://digital-search.dtme-splunk.euw1.dev.aws.cloud.hsbc:8089/servicesNS/${user}/dsp_${pj}/search/jobs`
    let data = {
        url: url,
        proxy: proxy,
        form: {
            "search": `search index=*mAuth* "List=*${phoneEnding}" Text="*"  | rex field=_raw "(?ms)^(?P<DateTime>\\d+\\-\\d+\\-\\d+\\s+\\d+:\\d+:\\d+\\.\\d+)" | rex field=_raw "^(?:[^\\]\\n]*\\])*\\s+\\w+=(?P<Number>\\+\\d+)"`,
            "exec_mode": "oneshot",
            "output_mode": "json",
            "id": `dsp_${pj}${user}`,
            "earliest_time": "-15m"
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
            let message = process(result.Text, result.DateTime, result.Number);
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


