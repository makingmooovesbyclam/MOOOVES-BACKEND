// ✅ 5 in a row check on N×N board
exports.checkWinner = (board, row, col, symbol) => {
  const directions = [
    [0, 1],  // horizontal →
    [1, 0],  // vertical ↓
    [1, 1],  // diagonal ↘
    [1, -1]  // diagonal ↙
  ];

  const inBounds = (r, c) => r >= 0 && r < board.length && c >= 0 && c < board.length;

  for (const [dr, dc] of directions) {
    let count = 1;

    // forward direction
    let r = row + dr, c = col + dc;
    while (inBounds(r, c) && board[r][c] === symbol) {
      count++; r += dr; c += dc;
    }

    // backward direction
    r = row - dr; c = col - dc;
    while (inBounds(r, c) && board[r][c] === symbol) {
      count++; r -= dr; c -= dc;
    }

    if (count >= 5) return symbol;
  }

  const draw = board.flat().every(cell => cell);
  return draw ? 'draw' : null;
};