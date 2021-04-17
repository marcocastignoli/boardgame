class Dice {
    constructor(faces) {
        this.faces = faces
    }
}

function dices(n, faces) {
    let dices = []
    for (let i = 0; i < n; i++) {
        dices.push(new Dice(faces))
    }
    return dices;
}


function roll(dices = []) {
    return dices.reduce((total, dice) => total + Math.floor(Math.random() * dice.faces) + 1, 0)
}

export {
    dices,
    roll
}