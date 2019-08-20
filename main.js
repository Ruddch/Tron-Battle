const {performance} = require('perf_hooks');

const xAxis = 30;
const yAxis = 20;
let Mode = 'NORM';

const mapCords = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1),
);
const Points = [];
let squares = [0, 0, 0, 0];
const mapTransactions = [];
const Log = [[], [], [], []];

function addTransaction(point, value) {
    const prevValue = mapCords[point.x][point.y];
    mapCords[point.x][point.y] = value;
    mapTransactions.push({point, value: prevValue});
}

function cancelTransaction() {
    const {point, value} = mapTransactions.pop();
    mapCords[point.x][point.y] = value;
}

const VDs = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => '_'),
);

const distances = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1000),
);

function calcVD(points) {
    let count = 0;
    const squares = [0, 0, 0, 0];
    const acc = [];
    points = points.map(p => [p]);
    function fillDistance(_, i) {
        points[i].forEach(p => {
            if (p.x !== -1 && VDs[p.x][p.y] === '_') {
                VDs[p.x][p.y] = i;
                addTransaction(p, 0);
                squares[i]++;
                count++;
                acc.push(...getAvailablePoints(p));
            }
        });
        points[i].length = 0;
        points[i].push(...acc);
        acc.length = 0;
    }

    VDs.forEach(r => r.forEach((c, i) => (r[i] = '_')));

    while (points.some(p => p.length)) points.forEach(fillDistance);

    for (let i = 0; i < count; i++) cancelTransaction();

    return squares;
}

function calcMyDistances() {
    let cost = 1;
    const acc = [];

    distances.forEach(r => r.forEach((c, i) => (r[i] = 1000)));
    const point = Points[P];

    distances[point.x][point.y] = 1000;
    const availablePoints = getAvailablePoints(point);

    while (availablePoints.length) {
        clearArray(acc);
        availablePoints.forEach(p => {
            const currCost = distances[p.x][p.y];
            if (currCost > cost) {
                distances[p.x][p.y] = cost;
                const ap = getAvailablePoints(p);
                acc.push(...ap);
            }
        });
        clearArray(availablePoints);
        availablePoints.push(...acc);
        cost++;
    }
    return distances;
}

function clearArray(array) {
    while (array.length) array.pop();
}

function notCrash({x, y}) {
    if (!(mapCords[x] || [])[y] || x < 0 || x > 29 || y < 0 || y > 19)
        return false;
    return true;
}

function getPossiblePoints({x, y} = {}) {
    return [{x, y: y - 1}, {x, y: y + 1}, {x: x - 1, y}, {x: x + 1, y}];
}

function getAvailablePoints(point) {
    const possiblePoints = getPossiblePoints(point);
    const res = possiblePoints.filter(p => notCrash(p));
    return res;
}

function printMap(map) {
    for (let i = 0; i < yAxis; i++)
        console.error(map.reduce((str, j) => str + j[i] + '|', ''));

    console.error('================');
}

function measureTime(f, name) {
    return function() {
        const timeBefore = performance.now();
        const res = f.apply(this, arguments);
        const timeAfter = performance.now();
        console.error((name || '') + ': ' + (timeAfter - timeBefore));
        return res;
    };
}

function killEnemy(i) {
    while (Log[i].length) {
        const point = Log[i].pop();
        mapCords[point.x][point.y] = 1;
    }
}

function getReachable(points) {
    points.forEach((p, i) => {
        if (p.x > -1 && i !== P) addTransaction(p, 1);
    });
    calcMyDistances();
    const res = [];
    points.forEach((p, i) => {
        if (p.x > -1 && i !== P) {
            if (distances[p.x][p.y] < 1000) res.push(i);
            cancelTransaction();
        }
    });
    return res;
}
function isBorder({x, y}) {
    return x === 0 || x === 29 || y === 19 || y === 0;
}

function isNear({x, y}) {
    return (
        isBorder({x, y}) ||
        (distances[x - 1][y + 1] === 1000 ||
            distances[x + 1][y + 1] === 1000 ||
            distances[x - 1][y - 1] === 1000 ||
            distances[x + 1][y - 1] === 1000)
    );
}

function calcScore(points, i) {
    const s = calcVD(points);
    const eSquares = squares.filter((s, i) => i !== P);
    const mySquare = s[P];

    return {
        squares: s,
        score:
            mySquare -
            (!isNaN(i)
                ? squares[i]
                : eSquares.reduce((sum, s) => sum + s, 0) / eSquares.length),
    };
}

const mapPointTransactions = [];

function addPointsTransaction(point, i) {
    const prevPoint = Points[i];
    Points[i] = point;
    mapPointTransactions.push({i, point: prevPoint});
}

function cancelPointsTransaction() {
    const {i, point} = mapPointTransactions.pop();
    Points[i] = point;
}

const mapSquareTransactions = [];

function addSquaresTransaction(s) {
    const prevSquares = [...squares];
    squares = s;
    mapSquareTransactions.push(prevSquares);
}

function cancelSquaresTransaction() {
    const s = mapSquareTransactions.pop();
    squares = s;
}

function calcRScore(myPoint) {
    addTransaction(myPoint, 0);
    const result = [];
    addPointsTransaction(myPoint, P);

    let calcScoreRes = calcScore(Points);
    addSquaresTransaction(calcScoreRes.squares);

    result.push(calcScoreRes.score);
    if (step === 30) printMap(VDs);
    let depth;
    if (Mode === 'FILL') depth = 2;
    else if (activeEnemy > 2) depth = 0;
    else depth = 1;

    iter(depth);

    function iter(depth) {
        if (Mode !== 'FILL') {
            Points.forEach((p, i) => {

                if (i !== P && p.x !== -1) {
                    const availablePoints = getAvailablePoints(p);
                    if (!availablePoints.length) {
                        result.push(
                            squares[P] *
                                (getAvailablePoints(Points[P]).length + 1),
                        );
                    }

                    availablePoints.forEach(availableP => {
                        addTransaction(availableP, 0);
                        addPointsTransaction(availableP, i);
                        calcScoreRes = calcScore(Points, i);
                        addSquaresTransaction(calcScoreRes.squares);

                        result.push(calcScoreRes.score);
                        calcMyPoints(Points[P], depth, i);

                        cancelSquaresTransaction();
                        cancelPointsTransaction();
                        cancelTransaction();
                    });
                }
            });
        } else {
            calcMyPoints(Points[P], depth);
        }
    }

    function calcMyPoints(point, depth, enemyIndex) {
        const myAvailablePoints = getAvailablePoints(point);
        if (!myAvailablePoints.length) result.push(-5000);

        myAvailablePoints.forEach(myAvailablePoint => {
            addTransaction(myAvailablePoint, 0);
            addPointsTransaction(myAvailablePoint, P);
            calcScoreRes = calcScore(Points, enemyIndex);
            addSquaresTransaction(calcScoreRes.squares);

            result.push(calcScoreRes.score);
            cancelSquaresTransaction();
            cancelPointsTransaction();
            cancelTransaction();
            if (depth > 0) iter(depth - 1);
        });
    }

    cancelSquaresTransaction();
    cancelPointsTransaction();
    cancelTransaction();
    return result;
}

function getDirByPoint({x, y}) {
    const {x: xc, y: yc} = Points[P];
    if (x > xc) return 'RIGHT';
    if (x < xc) return 'LEFT';
    if (y > yc) return 'DOWN';
    if (y < yc) return 'UP';
}

function whatDirNext() {
    squares = calcVD(Points);
    const res = getAvailablePoints(Points[P])
        .map(p => ({
            dir: getDirByPoint(p),
            score: calcRScore(p).reduce(
                (sum, s, i, arr) => sum + s / arr.length,
                0,
            ),
        }))
        .sort((a, b) => b.score - a.score);
    console.error(res);
    return res[0].dir;
}

// game loop
let step = 1;
let N;
let P;
let activeEnemy = 0;
while (true) {
    const inputs = readline().split(' ');
    N = parseInt(inputs[0]); // total number of players (2 to 4).
    P = parseInt(inputs[1]); // your player number (0 to 3).
    let count = 0;
    activeEnemy = 0;
    for (let i = 0; i < N; i++) {
        const inputs = readline().split(' ');
        const X0 = parseInt(inputs[0]); // starting X coordinate of lightcycle (or -1)
        const Y0 = parseInt(inputs[1]); // starting Y coordinate of lightcycle (or -1)
        const X1 = parseInt(inputs[2]); // starting X coordinate of lightcycle (can be the same as X0 if you play before this player)
        const Y1 = parseInt(inputs[3]); // starting Y coordinate of lightcycle (can be the same as Y0 if you play before this player)
        if (X1 > -1) {
            mapCords[X0][Y0] = 0;
            mapCords[X1][Y1] = 0;
            Log[i].push({x: X1, y: Y1});
            activeEnemy++;
        } else {
            killEnemy(i);
        }
        Points[i] = {x: X1, y: Y1};

        count++;
    }

    Mode = getReachable(Points).length ? 'NORM' : 'FILL';
    console.error(Mode);
    const direction = measureTime(whatDirNext)();
    step++;
    console.log(direction); // A single line with UP, DOWN, LEFT or RIGHT
}
