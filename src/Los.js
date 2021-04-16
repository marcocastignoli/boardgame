import PF from 'pathfinding'

function arrayToGrid(array, columns) {
    let matrix = []

    let row = 0
    array.forEach(i => {
        if (!matrix[row]) {
            matrix[row] = []
        }
        matrix[row].push(i)
        if (matrix[row].length === columns) {
            row++
        }
    })
    return matrix
}

function Los(arrayWall, columns, point1, point2) {
    const gridWall = new PF.Grid(arrayToGrid(arrayWall, columns));

    const arrayClean = new Array(arrayWall.length).fill(0);
    const gridClean = new PF.Grid(arrayToGrid(arrayClean, columns));
    
    const finder = new PF.AStarFinder({
        allowDiagonal: true,
        dontCrossCorners: true
    });

    const pathWall = finder.findPath(point1[0], point1[1], point2[0], point2[1], gridWall);
    console.log(pathWall)
    const pathClean = finder.findPath(point1[0], point1[1], point2[0], point2[1], gridClean);
    console.log(pathClean)
    return pathClean.length === pathWall.length
}

/* console.log(LOS([
    0, 0, 0, 1, 0,
    1, 0, 0, 0, 1,
    1, 0, 0, 0, 0,
], 5, [0,0], [2,2])) */

export default Los