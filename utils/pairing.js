// utils/pairing.js
exports.pairPlayers = (players) => {
  const shuffled = players.sort(() => 0.5 - Math.random());
  const pairs = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const player1 = shuffled[i];
    const player2 = shuffled[i + 1] || null; // odd players: one gets a bye
    pairs.push([player1, player2]);
  }

  return pairs;
};