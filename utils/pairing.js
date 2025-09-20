// utils/pairing.js
exports.pairPlayers = (players, alreadyPlayed = []) => {
  // exclude players who already played in past rounds
  const available = players.filter(p => !alreadyPlayed.includes(String(p)));

  const shuffled = available.sort(() => 0.5 - Math.random());
  const pairs = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const player1 = shuffled[i];
    const player2 = shuffled[i + 1] || null;
    pairs.push([player1, player2]);
  }

  return pairs;
};