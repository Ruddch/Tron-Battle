const {performance} = require('perf_hooks');
const xAxis = 30;
const yAxis = 20;

let direction = 'UP';
const mapCords = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1),
);
const enemyPoint = [];
const prevEnemyPoint = [];
let myPoint;
const enemyDir = [];
const mapTransactions = [];
const enemyLog = [[], [], []];
let numPlayers = 0;

function addTransaction(point, value) {
    //console.error(point, value)
    const prevValue = mapCords[point.x][point.y];
    mapCords[point.x][point.y] = value;
    mapTransactions.push({point, value: prevValue});
}

function cancelTransaction() {
    const {point, value} = mapTransactions.pop();
    mapCords[point.x][point.y] = value;
}

const dirs = {
    UP: ['UP', 'RIGHT', 'LEFT'],
    LEFT: ['LEFT', 'UP', 'DOWN'],
    DOWN: ['DOWN', 'LEFT', 'RIGHT'],
    RIGHT: ['RIGHT', 'DOWN', 'UP'],
};

const distances = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1000),
);

const e1Distances = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1000),
);
const e2Distances = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1000),
);
const e3Distances = Array.from({length: xAxis}, v =>
    Array.from({length: yAxis}, () => 1000),
);

function calcDistances(point, dir, distances) {
    let cost = 1;
    const acc = [];

    distances.forEach(r => r.forEach((c, i) => (r[i] = 1000)));

    if (!point) return distances;

    distances[point.x][point.y] = 0;
    const availableDirs = getAvailableDirs(point, dir).map(d => ({
        dir: d,
        point,
    }));

    while (availableDirs.length) {
        clearArray(acc);
        availableDirs.forEach(d => {
            const nextPoint = getNextPoint(d.point, d.dir);
            const currCost = distances[nextPoint.x][nextPoint.y];
            if (currCost > cost) {
                distances[nextPoint.x][nextPoint.y] = cost;
                const ad = getAvailableDirs(nextPoint, d.dir);
                ad.forEach((d, i, arr) => {
                    arr[i] = {
                        dir: d,
                        point: nextPoint,
                    };
                });
                acc.push(...ad);
            }
        });
        clearArray(availableDirs);
        availableDirs.push(...acc);
        cost++;
    }
    return distances;
}

function clearArray(array) {
    while (array.length) array.pop();
}

function getDistanceDiff() {
    let meCloser = 0;
    let enemy1Closer = 0;
    let enemy2Closer = 0;
    let enemy3Closer = 0;
    for (let x = 0; x < xAxis; x++) {
        for (let y = 0; y < yAxis; y++) {
            if (
                distances[x][y] < e1Distances[x][y] &&
                distances[x][y] < e2Distances[x][y] &&
                distances[x][y] < e3Distances[x][y]
            )
                meCloser++;
            if (
                e1Distances[x][y] < distances[x][y] &&
                e1Distances[x][y] < e2Distances[x][y] &&
                e1Distances[x][y] < e3Distances[x][y] 
            )
                enemy1Closer++;
            if (
                e2Distances[x][y] < distances[x][y] &&
                e2Distances[x][y] < e1Distances[x][y] &&
                e2Distances[x][y] < e3Distances[x][y] 
            )
                enemy2Closer++;
                
            if (
                e3Distances[x][y] < distances[x][y] &&
                e3Distances[x][y] < e1Distances[x][y] &&
                e3Distances[x][y] < e2Distances[x][y] 
            )
                enemy3Closer++;
        }
    }
    return meCloser - (enemy1Closer + enemy1Closer + enemy1Closer) / (numPlayers - 1);//Math.max(enemy1Closer, enemy2Closer, enemy3Closer);
}

function getNextPoint({x, y} = {}, direction) {
    if (direction === 'UP') return {x, y: --y};
    if (direction === 'DOWN') return {x, y: ++y};
    if (direction === 'LEFT') return {x: --x, y};
    if (direction === 'RIGHT') return {x: ++x, y};
    if (direction === 'DEAD') return undefined;
}

function notCrash({x, y}, dir) {
    if (!(mapCords[x] || [])[y]) return false;
    if (dir === 'UP') return y >= 0;
    else if (dir === 'DOWN') return y < yAxis;
    else if (dir === 'LEFT') return x >= 0;
    else return x < xAxis;
}

function reduceOwnDirs(
    point,
    dir,
    enemyPoint1,
    enemyDir1,
    enemyPoint2,
    enemyDir2,
    enemyPoint3,
    enemyDir3,
    depth,
    branch,
) {
    if (depth > 0) {
        const availableDirs = getAvailableDirs(point, dir);
        const f = numPlayers > 2 ? getSum : getDeepSum;
        return (
            availableDirs.reduce(
                (sum, d) =>
                    sum +
                    f(
                        getNextPoint(point, d),
                        d,
                        branch !== 1
                            ? enemyPoint1
                            : getNextPoint(enemyPoint1, enemyDir1),
                        enemyDir1,
                        branch !== 2
                            ? enemyPoint2
                            : getNextPoint(enemyPoint2, enemyDir2),
                        enemyDir2,
                        branch !== 3
                            ? enemyPoint3
                            : getNextPoint(enemyPoint3, enemyDir3),
                        enemyDir3,
                        depth - 1,
                        branch,
                    ),
                availableDirs.length ? 1 : -200,
            ) / (availableDirs.length || 1)
        );
    } else {
        return getSum(
            point,
            dir,
            enemyPoint1,
            enemyDir1,
            enemyPoint2,
            enemyDir2,
            enemyPoint3,
            enemyDir3,
        );
    }
}

function getDeepSum(
    point,
    dir,
    enemyPoint1,
    enemyDir1,
    enemyPoint2,
    enemyDir2,
    enemyPoint3,
    enemyDir3,
    depth,
    branch,
) {
    addTransaction(point, 0);
    if (enemyPoint1) addTransaction(enemyPoint1, 0);
    if (enemyPoint2) addTransaction(enemyPoint2, 0);
    if (enemyPoint3) addTransaction(enemyPoint3, 0);
    const availableEnemyDir1 = getAvailableDirs(enemyPoint1, enemyDir1);
    const availableEnemyDir2 = getAvailableDirs(enemyPoint2, enemyDir2);
    const availableEnemyDir3 = getAvailableDirs(enemyPoint3, enemyDir3);
    const isEnemy1 = branch === 1 || branch === 0;
    const isEnemy2 = branch === 2 || branch === 0;
    const isEnemy3 = branch === 3 || branch === 0;
    
    const e1Sum =
        isEnemy1 && enemyPoint1
            ? availableEnemyDir1.reduce(
                  (eSum, ed) =>
                      eSum +
                      reduceOwnDirs(
                          point,
                          dir,
                          enemyPoint1,
                          ed,
                          depth || isEnemy1 ? enemyPoint2 : undefined,
                          enemyDir2,
                          depth || isEnemy1 ? enemyPoint3 : undefined,
                          enemyDir3,
                          depth,
                          1,
                      ),
                  availableEnemyDir1.length ? 1 : 100,
              ) / (availableEnemyDir1.length || 1)
            : 1;
    
    const e2Sum =
        isEnemy2 && enemyPoint2
            ? availableEnemyDir2.reduce(
                  (eSum, ed) =>
                      eSum +
                      reduceOwnDirs(
                          point,
                          dir,
                          depth || isEnemy2 ? enemyPoint1 : undefined,
                          enemyDir1,
                          enemyPoint2,
                          ed,
                          depth || isEnemy2 ? enemyPoint3 : undefined,
                          enemyDir3,
                          depth,
                          2,
                      ),
                  availableEnemyDir2.length ? 1 : 100,
              ) / (availableEnemyDir2.length || 1)
            : 1;
            
    const e3Sum =
        isEnemy3 && enemyPoint3
            ? availableEnemyDir3.reduce(
                  (eSum, ed) =>
                      eSum +
                      reduceOwnDirs(
                          point,
                          dir,
                          depth || isEnemy2 ? enemyPoint1 : undefined,
                          enemyDir1,
                          depth || isEnemy1 ? enemyPoint2 : undefined,
                          enemyDir2,
                          enemyPoint3,
                          ed,
                          depth,
                          3,
                      ),
                  availableEnemyDir3.length ? 1 : 100,
              ) / (availableEnemyDir1.length || 1)
            : 1;
    cancelTransaction();
    if (enemyPoint1) cancelTransaction();
    if (enemyPoint2) cancelTransaction();
    if (enemyPoint3) cancelTransaction();
    return (e2Sum + e1Sum + e3Sum) / (numPlayers - 1);
}

function getAvailableDirs({x, y} = {}, dir) {
    const possibleDirs = dirs[dir];
    const res = possibleDirs
        ? possibleDirs.filter(d => {
              const point = getNextPoint({x, y}, d);
              return notCrash(point, d);
          })
        : ['DEAD'];
    return res;
}

const getSum = function(point, dir, enemyPoint1, eDir1, enemyPoint2, eDir2) {
    calcDistances(point, dir, distances);
    addTransaction(point, 1);
    calcDistances(enemyPoint1, eDir1, e1Distances);
    calcDistances(enemyPoint2, eDir2, e2Distances);
    cancelTransaction();
    const diff = getDistanceDiff();
    return diff;
};

const whatDirNext = ({x, y}, dir) => {
    const availableDirs = getAvailableDirs({x, y}, dir);
    //if (step === 1) return availableDirs[0];
    const countedDirs = availableDirs.map(d => ({
        sum: getDeepSum(
            getNextPoint({x, y}, d),
            d,
            enemyPoint[0],
            enemyDir[0],
            enemyPoint[1],
            enemyDir[1],
            enemyPoint[2],
            enemyDir[2],
            1,
            0,
        ),
        dir: d,
    }));
    let res = countedDirs[0] || {dir: 'UP'};
    countedDirs.forEach(d => {
        if (d.sum > res.sum) res = d;
    });
    //console.error(countedDirs);

    return res.dir;
};

function getEnemyDir(point, prevPoint) {
    if (!point) return 'DEAD';
    let dir = 'UP';
    if (point.x - prevPoint.x > 0) dir = 'RIGHT';
    else if (point.x - prevPoint.x < 0) dir = 'LEFT';
    else if (point.y - prevPoint.y > 0) dir = 'DOWN';

    return dir;
}

function printMap(map) {
    for (let i = 0; i < yAxis; i++) console.error(map.map(j => j[i]));

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
    while (enemyLog[i].length) {
        const point = enemyLog[i].pop();
        mapCords[point.x][point.y] = 1;
    }
}

// game loop
let step = 1;
while (true) {
    const inputs = readline().split(' ');
    const N = parseInt(inputs[0]); // total number of players (2 to 4).
    const P = parseInt(inputs[1]); // your player number (0 to 3).
    let count = 0;
    numPlayers = 0;
    for (let i = 0; i < N; i++) {
        const inputs = readline().split(' ');
        const X0 = parseInt(inputs[0]); // starting X coordinate of lightcycle (or -1)
        const Y0 = parseInt(inputs[1]); // starting Y coordinate of lightcycle (or -1)
        const X1 = parseInt(inputs[2]); // starting X coordinate of lightcycle (can be the same as X0 if you play before this player)
        const Y1 = parseInt(inputs[3]); // starting Y coordinate of lightcycle (can be the same as Y0 if you play before this player)
        if (X1 > -1) {
            mapCords[X0][Y0] = 0;
            mapCords[X1][Y1] = 0;
            numPlayers++;
        }
        if (i === P) {
            myPoint = {x: X1, y: Y1};
        } else {
            prevEnemyPoint[count] = enemyPoint[count] || {};
            enemyPoint[count] = X1 > -1 ? {x: X1, y: Y1} : undefined;
            enemyDir[count] = getEnemyDir(
                enemyPoint[count],
                prevEnemyPoint[count],
            );
            if (X1 > -1) enemyLog[count].push({x: X1, y: Y1});
            else killEnemy(count);
            count++;
        }
    }
    //printMap(mapCords);
    direction = whatDirNext(myPoint, direction);
    step++;
    console.log(direction); // A single line with UP, DOWN, LEFT or RIGHT
}
