const util = require('util');
const fs = require("fs");
const EloRating = require('elo-rating');
const config = require('./config/config');
const character = require('./config/character');

let temp = [];
let spam = [];

module.exports = {
    temp: temp,
    spam: spam,

    reportMatch: reportMatch,
    confirm: confirm,
    findChar: findChar,
    ranking: ranking,
    myPoints: myPoints,
    help: help
};

function reportMatch(arg, msg, client) {
    let error = false;
    let errorMsg = '';
    let p2 = undefined;
    let p1Char = undefined;
    let p2Char = undefined;
    let p1Type = undefined;
    let p2Type = undefined;
    let game = undefined;
    let retMsg = undefined;

    if(isSpam(msg)) return;

    if(arg.length < 6) {
        msg.reply("\nNúmero de argumentos inválido.\nComando precisa seguir o seguinte formato\n" +
            "!report [personagem] [vitórias] [@oponente] [personagem do oponente] [vitórias do oponente]\n" +
            "Exemplo: !report C-NA 1 <@"+client.user.id+"> H-KI 7");
        return;
    }
    if(typeof config.server[msg.guild.id] === 'undefined')
    {
        msg.reply("Server sem configuração.");
        return;
    }
    if(client.user.id === arg[3].slice(2, -1)) {
        msg.reply("Player é o próprio bot.");
        return;
    }
    if((msg.author.id) === arg[3].slice(2, -1)) {
        msg.reply("Mesmo player.");
        return;
    }

    p2 = client.users.get(arg[3].replace(/[^0-9]/g, ''));
    console.log(p2);
    if(typeof p2 === 'undefined') {
        error = true;
        errorMsg += "Erro: Player não é válido.\n";
    } 
    if(isNaN(arg[2]) && isNaN(arg[5])) {
        error = true;
        errorMsg += "Erro: Resultado da partida não são números.\n";
    }
    if(arg[2] > 100 || arg[5] > 100) {
        error = true;
        errorMsg += "Erro: Não são aceitos mais do que 100 vitórias por report.\n";
    }
    if(arg[2] < 0 || arg[5] < 0) {
        error = true;
        errorMsg += "Erro: Não são aceitos vitórias negativas.\n";
    }

    game = config.server[msg.guild.id].game;
    p1Char = character[game].character.find((element) => { return element.alias.toLocaleLowerCase() === arg[1].slice(-2)})
    p2Char = character[game].character.find((element) => { return element.alias.toLocaleLowerCase() === arg[4].slice(-2)})

    if(character[game].type > 0){
        p1Type = character[game].type.find((element) => { return element.alias.toLocaleLowerCase() === arg[1].slice(0, 1)})
        p2Type = character[game].type.find((element) => { return element.alias.toLocaleLowerCase() === arg[4].slice(0, 1)})

        if(typeof p1Char === 'undefined' || typeof p2Char === 'undefined' || typeof p1Type === 'undefined' || typeof p2Type === 'undefined' ) {
            error = true;
            errorMsg += "Erro: Personagem ou lua não encontrado.\n";
        }
    } else {
        p1Type = {name:'', alias:''};
        p2Type = {name:'', alias:''};

        if(typeof p1Char === 'undefined' || typeof p2Char === 'undefined') {
            error = true;
            errorMsg += "Erro: Personagem não encontrado.\n";
        }
    }

    if(error) {
        msg.reply("\n"+errorMsg+"\nComando precisa seguir o seguinte formato\n" +
            "!report [personagem] [vitórias] [@oponente] [personagem do oponente] [vitórias do oponente]\n" +
            "Exemplo: !report C-NA 1 <@"+client.user.id+"> H-KI 7");
        return;
    }

    let tempIndex = temp.findIndex((report) => {return report.p1 === msg.author.id || report.p2 === msg.author.id || report.p1 === p2.id || report.p2 === p2.id});
    if (tempIndex != -1) {
        msg.reply("Já possui um pedido de confirmação seu, para você ou para o seu oponente, em andamente.");
        return;
    }
    tempIndex = undefined;

    retMsg = (config.confirmTimeout/1000).toString() + " segundo(s) para o player " + arg[3] + " confirmar o resultado.\n";
    if(typeof p1Type === 'undefined' || typeof p2Type === 'undefined') {
        retMsg += "**" + p1Char.name + " " + arg[2] + " vs " + arg[5] + " " + p2Char.name + "**" + "\n";
    } else {
        retMsg += "**" + p1Type.alias + "-" + p1Char.name + " " + arg[2] + " vs " + arg[5] + " " + p2Type.alias + "-" + p2Char.name + "**" + "\n";
    }
    retMsg += "Digite !confirm para confirmar.";

    msg.reply(retMsg);

    let timeoutID = setTimeout(function () {
        let index = (temp.map((arr) => arr.id)).indexOf(timeoutID);
        if (index != -1) temp.splice(index, 1);
        msg.reply("Tempo esgotado");
    }, config.confirmTimeout);

    temp.push({'id': timeoutID,'p1': msg.author.id,'p1Character': p1Char.alias,'p1Type': p1Type.alias ,'p1Victory': arg[2],'p2': p2.id,'p2Character': p2Char.alias,'p2Type': p2Type.alias,'p2Victory': arg[5]});
}

function confirm (arg, msg, client) {
    let index = (temp.map((arr) => arr.p2)).indexOf(msg.author.id);
    let confirmedResult = undefined;

    if(isSpam(msg)) return;

    if (index != -1) confirmedResult = temp.splice(index, 1);
    else {
        msg.reply("Report não encontrado.");
        return;
    }

    if (!fs.existsSync("./data/ranking.json")) {
        let ranking = {};
        ranking[msg.guild.id] = [];
        let json = JSON.stringify(ranking);
        fs.writeFile('./data/ranking.json', json, 'utf8', function(err) {if (err) throw err;});
    }

    fs.readFile('./data/ranking.json', 'utf-8', function(err, data) {
        if (err) throw err;

        let rankingFile = JSON.parse(data);
        let ranking = rankingFile[msg.guild.id];
        let p1Index = undefined;
        let p2Index = undefined;

        if(typeof ranking === 'undefined') {
            ranking = [];
        }

        console.log(util.inspect(ranking));

        p1Index = ranking.findIndex((elo) => { return elo.discordID === confirmedResult[0].p1 && elo.character === confirmedResult[0].p1Character && elo.type === confirmedResult[0].p1Type});
        p2Index = ranking.findIndex((elo) => { return elo.discordID === confirmedResult[0].p2 && elo.character === confirmedResult[0].p2Character && elo.type === confirmedResult[0].p2Type});

        console.log("p1Index: " + p1Index + "\np2Index: " + p2Index);

        if(p1Index == -1) {
            p1Index = ranking.push({
                discordID: confirmedResult[0].p1,
                character: confirmedResult[0].p1Character,
                type: confirmedResult[0].p1Type,
                points: 0
            })-1;
        }
        if(p2Index == -1) {
            p2Index = ranking.push({
                discordID: confirmedResult[0].p2,
                character: confirmedResult[0].p2Character,
                type: confirmedResult[0].p2Type,
                points: 0
            })-1;
        }

        let totalMatchs = parseInt(confirmedResult[0].p1Victory) + parseInt(confirmedResult[0].p2Victory);
        let p1v = 0;
        let p2v = 0;
        for(let i = 1; i <= totalMatchs; i++) {
            console.log("Partida: " + i + "\n" +
                "p1Victory: " + confirmedResult[0].p1Victory + "\n" + 
                "p2Victory: " + confirmedResult[0].p2Victory);
            if(p1v == 0 && p2v == 0) {
                if((confirmedResult[0].p1Victory > confirmedResult[0].p2Victory) && confirmedResult[0].p1Victory > 0 && confirmedResult[0].p2Victory > 0) {
                    p1v = Math.round(confirmedResult[0].p1Victory/confirmedResult[0].p2Victory, 0);
                    p2v = 1;
                } else if((confirmedResult[0].p1Victory < confirmedResult[0].p2Victory) && confirmedResult[0].p1Victory > 0 && confirmedResult[0].p2Victory > 0) {
                    p1v = 1;
                    p2v = Math.round(confirmedResult[0].p2Victory/confirmedResult[0].p1Victory, 0);
                } else if(confirmedResult[0].p1Victory > 0 && confirmedResult[0].p2Victory > 0) {
                    p1v = 1;
                    p2v = 1;
                } else {
                    p1v = confirmedResult[0].p1Victory;
                    p2v = confirmedResult[0].p2Victory;
                }
                confirmedResult[0].p1Victory -= p1v;
                confirmedResult[0].p2Victory -= p2v;
            }
            //if((confirmedResult[0].p1Victory > 0 && (i%2) > 0) || confirmedResult[0].p2Victory == 0) {
            if(p1v > 0) {
                let eloCalc = EloRating.calculate(ranking[p1Index].points, ranking[p2Index].points, true, config.server[msg.guild.id].rankedCalculator);
                ranking[p1Index].points = eloCalc.playerRating;
                ranking[p2Index].points = eloCalc.opponentRating;
                //confirmedResult[0].p1Victory -= 1;
                p1v -= 1;

                console.log("Player 1 Ganhou");
            //} else if(confirmedResult[0].p2Victory > 0) {
            } else if(p2v > 0) {
                let eloCalc = EloRating.calculate(ranking[p1Index].points, ranking[p2Index].points, false, config.server[msg.guild.id].rankedCalculator);
                ranking[p1Index].points = eloCalc.playerRating;
                ranking[p2Index].points = eloCalc.opponentRating;
                //confirmedResult[0].p2Victory -= 1;
                p2v -= 1;

                console.log("Player 2 Ganhou");
            }

            if(ranking[p1Index].points < 0) ranking[p1Index].points = 0;
            if(ranking[p2Index].points < 0) ranking[p2Index].points = 0;
            console.log("Player 1 Elo: " + ranking[p1Index].points + "\n" +
                    "Player 2 Elo: " + ranking[p2Index].points + "\n");
        }

        console.log("Player 1: " + ranking[p1Index].discordID + " " + ranking[p1Index].points);
        console.log("Player 2: " + ranking[p2Index].discordID + " " + ranking[p2Index].points);

        rankingFile[msg.guild.id] = ranking;
        fs.writeFile('./data/ranking.json', JSON.stringify(rankingFile), 'utf-8', function(err) {
            if (err) throw err;
        });
    });

    clearTimeout(confirmedResult[0].id);
    msg.reply("Resultado confirmado.");
}

function findChar(arg, msg, client) {
    let charFound = '';
    let game = config.server[msg.guild.id].game;
    let retMsg = undefined;

    if(isSpam(msg)) return;

    if(typeof arg[1] === 'undefined') {
        character[game].character.forEach((char) => {
            charFound += char.alias.toString() + " - " + char.name.toString() + "\n";
        });
    } else {
        character[game].character.forEach((char) => {
            if(char.name.toLocaleLowerCase().indexOf(arg[1]) > -1) {
                charFound += char.alias.toString() + " - " + char.name.toString() + "\n";
            }
        });
    }
    console.log(charFound);

    if(charFound === '') {
        retMsg = "Nenhum personagem encontrado.";
    } else {
        retMsg = "```markdown\nPersonagens encontrados: \n" + charFound + "```";
    }

    replyMsg(msg, arg, retMsg);
}

function ranking(arg, msg, client) {
    let game = undefined;
    let retMsg = undefined;

    if(isSpam(msg)) return;

    if (!fs.existsSync("./data/ranking.json")) {
        msg.reply("Não há partidas a serem buscadas.");
        return;
    } else if (typeof config.server[msg.guild.id] === 'undefined') {
        msg.reply("Server sem configuração.");
        return;
    }

    game = config.server[msg.guild.id].game;

    fs.readFile('./data/ranking.json', 'utf-8', function(err, data) {
        if (err) throw err;

        let rankingFile = JSON.parse(data);
        let ranking = rankingFile[msg.guild.id];
        let rankingString = '';
        let rankPosition  = 1;
        let retMsg = undefined;

        if(typeof ranking === 'undefined') {
            msg.reply("Não há players no ranking");
            return;
        }

        ranking.sort(function(a,b) {return (a.points > b.points) ? -1 : ((b.points > a.points) ? 1 : 0);} );
        ranking.some(function (eloLine) {
            let playerNick = '';
            playerNick = client.users.get(eloLine.discordID).username;

            rankingString += rankPosition + " - " + playerNick + " - ";

            if(character[game].type > 0) {
                rankingString += character[game].type.find((element) => { return element.alias === eloLine.type}).alias + "-";
            }
            rankingString += character[game].character.find((element) => { return element.alias === eloLine.character}).name  + " (" + eloLine.points + ")\n";

            if (rankPosition >= 50) return true;
            rankPosition++;
            return false;
        });
        
        if(rankingString.length > 0) {
            retMsg = "```coffeescript\n" + rankingString + "```";
        } else {
            retMsg = "Não há ranking a ser mostrado.";
        }
        
        replyMsg(msg, arg, retMsg);
    });
}

function myPoints(arg, msg, client) {
    let game = undefined;

    if(isSpam(msg)) return;

    if (!fs.existsSync("./data/ranking.json")) {
        msg.reply("Não há partidas a serem buscadas.");
        return;
    } else if (typeof config.server[msg.guild.id] === 'undefined') {
        msg.reply("Server sem configuração.");
        return;
    }

    game = config.server[msg.guild.id].game;

    fs.readFile('./data/ranking.json', 'utf-8', function(err, data) {
        if (err) throw err;

        let rankingFile = JSON.parse(data);
        let ranking = rankingFile[msg.guild.id];
        let rankingString = '';
        let rankPosition  = 1;
        let retMsg = undefined;

        if(typeof ranking === 'undefined') {
            msg.reply("Não há pontos no ranking");
            return;
        }

        ranking.sort(function(a,b) {return (a.points > b.points) ? -1 : ((b.points > a.points) ? 1 : 0);} );
        ranking.some(function (eloLine) {
            let playerNick = '';
            playerNick = client.users.get(eloLine.discordID).username;

            if(client.users.get(eloLine.discordID).id === msg.author.id) {
                rankingString += rankPosition + " - " + playerNick + " - ";

                if(character[game].type > 0) {
                    rankingString += character[game].type.find((element) => { return element.alias === eloLine.type}).alias + "-";
                }
                rankingString += character[game].character.find((element) => { return element.alias === eloLine.character}).name  + " (" + eloLine.points + ")\n";
            }
            rankPosition++;
            return false;
        });

        if(rankingString.length > 0) {
            retMsg = "```coffeescript\n" + rankingString + "```";
        } else {
            retMsg = "Não há pontos a ser mostrado.";
        }

        replyMsg(msg, arg, retMsg);
    });

}


function help(arg, msg, client) {
    let retMsg = undefined;
    if(isSpam(msg)) return;

    retMsg = "Lista de comandos:\n"+
        "**!report [personagem] [vitórias] [@oponente] [personagem do oponente] [vitórias do oponente]**\n" +
        "Exemplo: !report C-NA 1 <@"+client.user.id+"> H-KI 7\n" +
        "\n" +
        "**!confirm**\n" +
        "Usado para confirmar o resultado da partida (!report para você)\n" +
        "\n" +
        "**!findChar(-pvt) [personagem(opcional)]**\n" +
        "Usado para encontrar a sigla de 2 digitos do seu personagem\n" +
        "\n" +
        "**!ranking(-pvt)**\n" +
        "Usado para mostrar os primeiros 50 players/personagens do rank geral\n" +
        "\n" +
        "**!myPoints(-pvt)**\n" +
        "Usado para mostrar os seus pontos e a sua colocação do rank geral\n" +
        "\n" +
        "Obs: os comandos que possuem (-pvt), podem ser adicionados no final comandos (antes dos argumentos), para a mensagem ser enviada por private message, exemplo: !mypoints-pvt";


    replyMsg(msg, arg, retMsg);
}


//-------------------------------------------------------------------------------------------------------------


function isSpam(msg) {
    let userSpam;
    userSpam = spam.find((user) => { return user.id === msg.author.id});
    if (typeof userSpam === 'undefined') {
        spam.push({id:msg.author.id});

        let timeoutID = setTimeout(function () {
            let index = (spam.map((arr) => arr.id)).indexOf(msg.author.id);
            if (index != -1) spam.splice(index, 1);
        }, config.spamTimeout);

        return false;
    } 
    msg.reply("SPAM!");
    return true;
}

function replyMsg(msg, arg, retMsg) {
    if(arg[0].endsWith("-pvt")) {
        msg.author.send(retMsg);
    } else {
        msg.channel.sendMessage(retMsg);
    }
}