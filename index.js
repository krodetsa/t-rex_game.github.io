'use strict';
class Vector {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }

  plus(plusVector) {
    if (!(plusVector instanceof Vector)) {
        throw new Error('Можно прибавлять к вектору только Vector.');
    }
    return new Vector(this.x + plusVector.x, this.y + plusVector.y);
  }

  times(multiplierVector = 1) {
    return new Vector(this.x * multiplierVector, this.y * multiplierVector);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!((pos instanceof Vector)&&(size instanceof Vector)&&(speed instanceof Vector))) {
      throw new Error('pos не является объектом типа Vector.');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  isIntersect(moveActor) {
    if (!(moveActor instanceof Actor)) {
      throw new Error('moveActor не является объектом типа Actor');
    }
    if (this === moveActor) {
      return false;
    }
    return this.left < moveActor.right && this.top < moveActor.bottom &&
            this.right > moveActor.left && this.bottom > moveActor.top;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.actors = actors.slice();
    this.status = null;
    this.finishDelay = 1;
    this.grid = grid.slice();
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(element=> element.length));
    this.player = this.actors.find(actor => actor.type === 'player');
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(moveActor) {
    if (!(moveActor instanceof Actor)) {
      throw new Error("moveActor не является объектом типа Actor");
    }
    return this.actors.find(actor => actor.isIntersect(moveActor));
  }

  obstacleAt(position, size) {
    if (!((position instanceof Vector)&&(size instanceof Vector))) {
      throw new Error("Передан не вектор.");
    }

    const topBorder = Math.floor(position.y), bottomBorder = Math.ceil(position.y + size.y), leftBorder = Math.floor(position.x), rightBorder = Math.ceil(position.x + size.x);

    if (leftBorder < 0 || rightBorder > this.width || topBorder < 0) {
      return 'wall';
    }
    if (bottomBorder > this.height) {
      return 'lava';
    }

    for (let y = topBorder; y < bottomBorder; y++) {
      for (let x = leftBorder; x < rightBorder; x++) {
        const cell = this.grid[y][x];
        if (cell) {
          return cell;
        }
      }
    }
  }

  removeActor(actor) {
    const findInd = this.actors.indexOf(actor);
    if (findInd !== -1) {
      this.actors.splice(findInd, 1)
    }
  }

  noMoreActors(typeActor) {
    return !this.actors.some(actor => actor.type === typeActor);
  }

  playerTouched(touched, actor) {
    if (this.status !== null) {
      return
    }
    if (['lava', 'fireball'].some(element => element === touched )) {
      this.status = 'lost';
    }
    if (touched === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}


const obstaclesDict = {
  'x': 'wall',
  '!': 'lava'
};

class LevelParser {
  constructor(charsDict = {}) {
    this.actorsLibrary = Object.assign({}, charsDict);
  }

  actorFromSymbol(char) {
    return this.actorsLibrary[char];
  }

  obstacleFromSymbol(char) {
    return obstaclesDict[char];
  }

  createGrid(arrayGrid = []) {
    return arrayGrid.map(line => line.split('').map(char => this.obstacleFromSymbol(char)));
  }

  createActors(arrayActors = []) {
    const actors = [];
    arrayActors.forEach((itemY, y) => {
      itemY.split('').forEach((itemX, x) => {
        const constructorActors = this.actorFromSymbol(itemX);
        if (typeof constructorActors !== 'function') {
          return;
        }
        const result = new constructorActors(new Vector(x, y));
        if (result instanceof Actor) {
          actors.push(result);
        }
      });
    });
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}


class Fireball extends Actor {
  constructor(position = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(position, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(0,2));
  }
}

class FireRain extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 3));
    this.beginPosition = position;
  }

  handleObstacle() {
    this.pos = this.beginPosition;
  }
}

class Coin extends Actor {
  constructor(position = new Vector(0, 0)) {
    const pos = position.plus(new Vector(0.2, 0.1));
    super(pos, new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
    this.startPos = this.pos;
  }

  get type() {
    return 'coin';
  }

  updateSpring(number = 1) {
    this.spring += this.springSpeed * number;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(number = 1) {
    this.updateSpring(number);
    return this.startPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(position = new Vector(0, 0)) {
    super(position.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}
const schemas = [
  [
    '               v    ',
    '      v          v  ',
    '   v             =  ',
    '         o          ',
    ' @                 o',
    '    xx  xx         x',
    'xx         xxx      ',
    '!!!!!!!!!!!!!!!!!!!!'
  ],
  [
    '                  v                 ',
    '    =                             o ',
    '                              o  xxx',
    '        o    =            o         ',
    ' @     xxx                          ',
    '          o  xxx            o  xxx  ',
    'xxx      xxx        xxxxx           ',
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!xxx!!!!!!'
  ]
];
const actorDict = {
  '@': Player,
  'v': VerticalFireball,
  'o': Coin,
  '=': HorizontalFireball,
  '|': FireRain  
};
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => alert('Поздравляю, Вы прошли игру!'));
