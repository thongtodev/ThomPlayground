export function isCelebration(result){
 if(!result)return false;
 if(result.isNewBest)return true;
 const d=result.details||{};
 if(['tic','connect4'].includes(result.gameId))return d.winner!=null&&d.winner!=='draw';
 if(result.gameId==='simon')return d.success===true;
 if(result.gameId==='reaction')return d.validRounds>0;
 if(result.gameId==='mole')return result.metricValue>0;
 return result.eligible===true;
}
export function isNewRecord(entry,previous){
 if(!entry?.eligible)return false;
 if(!previous)return true;
 return ['steps','time','reaction'].includes(entry.metricKind)?Number(entry.metricValue)<Number(previous.metricValue):Number(entry.metricValue)>Number(previous.metricValue);
}
