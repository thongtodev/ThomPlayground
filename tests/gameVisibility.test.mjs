import test from 'node:test';
import assert from 'node:assert/strict';
import {getVisibleGames,getVisibleRewards} from '../src/gameVisibility.js';

const games=[{id:'mines'},{id:'mole'},{id:'puzzle'}];
const rewards=[
  {id:'mines-1',game:'mines'},
  {id:'mole-1',game:'mole'},
  {id:'puzzle-1',game:'puzzle'},
  {id:'all-1',game:'all'},
];

test('a game hidden by Admin is removed from public game lists',()=>{
  const visible=getVisibleGames(games,{mines:true,mole:false,puzzle:true});
  assert.deepEqual(visible.map(game=>game.id),['mines','puzzle']);
});

test('achievements for hidden games and global all-games rewards are hidden',()=>{
  const visible=getVisibleGames(games,{mines:true,mole:false,puzzle:true});
  assert.deepEqual(getVisibleRewards(rewards,visible,games).map(reward=>reward.id),['mines-1','puzzle-1']);
});

test('global achievements appear only while every game is enabled',()=>{
  assert.deepEqual(getVisibleRewards(rewards,games,games).map(reward=>reward.id),['mines-1','mole-1','puzzle-1','all-1']);
});
