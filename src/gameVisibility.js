/** Public-facing game visibility rules shared by home, achievements and leaderboards. */
export function getVisibleGames(allGames, availability = {}) {
  return (allGames || []).filter(game => availability?.[game.id] !== false);
}

export function getVisibleRewards(rewards, visibleGames, allGames) {
  const activeIds = new Set((visibleGames || []).map(game => game.id));
  const everyGameIsVisible = (allGames || []).length > 0 && activeIds.size === allGames.length;
  return (rewards || []).filter(reward => reward.game === 'all'
    ? (reward.id === 'all-nine' ? activeIds.size > 0 : everyGameIsVisible)
    : activeIds.has(reward.game));
}
