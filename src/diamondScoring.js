// A win always earns at least one star. Higher tiers depend only on final score.
export const diamondStars = (level, score) => score >= level.score3 ? 3 : score >= level.score2 ? 2 : 1;
export const bonusPerMove = level => Math.max(10, Math.round(Number(level.score3) / Math.max(1, Number(level.moveLimit)) / 2 / 10) * 10);
export function finalizeDiamondWin(state, level) {
 if (state.phase !== 'won' || state.winBonusApplied) return state;
 // Extra-move boosters cannot be converted into free score by finishing immediately.
 const bonusMoves = Math.max(0, Math.min(level.moveLimit, state.movesLeft - (state.extraMovesGranted || 0)));
 const moveBonusRate = bonusPerMove(level);
 const moveBonus = bonusMoves * moveBonusRate;
 return {...state, baseScore:state.score, bonusMoves, moveBonusRate, moveBonus, score:state.score + moveBonus, winBonusApplied:true};
}

export function diamondLoot(id,previousStars,stars,inventory){
  const loot=[];
  if(!previousStars)loot.push(['hammer','swap','shuffle','extra'][(id-1)%4]);
  if(stars===3)loot.push('hammer');
  const boosters={...inventory};
  for(const key of loot)boosters[key]=(boosters[key]||0)+1;
  return {loot,boosters};
}
