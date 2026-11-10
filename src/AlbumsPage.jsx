import React, {useEffect, useRef, useState} from 'react';
import {resolveAlbum} from './albumUtils';
import {DEFAULT_IMAGE} from './assetStore';
import {PuzzleAlbum} from './games/PuzzleGame';
import {JigsawAlbum} from './games/JigsawGame';
import {OnetAlbum,getSaved} from './games/OnetGame';
import {MinerAlbum,readProgress} from './games/MinerGame';
import {reconcileMinerRewards} from './minerCollection';

export default function AlbumsPage({games,config,gallery,progress,target,onHome}) {
  const [expanded,setExpanded]=useState(()=>new Set(target?[target]:[]));
  const targetHeading=useRef(null);
  useEffect(()=>{
    const heading=targetHeading.current;
    if(!heading){window.scrollTo(0,0);return;}
    heading.focus({preventScroll:true});
    heading.scrollIntoView({block:'start'});
  },[target]);
  function toggle(id){
    setExpanded(previous=>{
      const next=new Set(previous);
      if(next.has(id))next.delete(id);else next.add(id);
      return next;
    });
  }
  return <main className="collection-page game-albums-page">
    <button className="back-link" onClick={onHome}>Trang chủ</button>
    <h1>Bộ sưu tập</h1>
    {games.filter(game=>['puzzle','jigsaw','onet','miner'].includes(game.id)).map(({id,name})=>{
      let album=resolveAlbum(config[id+'Album'],gallery);
      let content,unlocked;
      if(id==='onet'){
        album=album.filter(photo=>photo.url&&photo.id!=='default-thom');
        const ids=getSaved().collection;
        unlocked=new Set(ids);
        content=<OnetAlbum album={album} unlockedIds={ids}/>;
      }else if(id==='miner'){
        const saved=reconcileMinerRewards(readProgress(),album);
        unlocked=new Set(Object.values(saved.rewards));
        content=<MinerAlbum album={album} unlockedIds={unlocked}/>;
      }else{
        if(id==='puzzle'&&!album.length)album=[{id:'default-thom',url:DEFAULT_IMAGE}];
        const records=progress[id+'Collection']||{};
        unlocked=new Set(Object.keys(records).filter(key=>records[key]?.easy||records[key]?.hard));
        const Grid=id==='puzzle'?PuzzleAlbum:JigsawAlbum;
        content=<Grid album={album} progress={records}/>;
      }
      const open=expanded.has(id);
      return <section key={id} id={id} className="game-album-section">
        <h2><button type="button" ref={id===target?targetHeading:null} aria-expanded={open}
          aria-controls={'album-'+id} onClick={()=>toggle(id)}>
          <span>{name}</span><small>{album.filter(photo=>unlocked.has(photo.id)).length}/{album.length} hình</small>
          <span aria-hidden="true">{open?'▴':'▾'}</span>
        </button></h2>
        <div id={'album-'+id} hidden={!open}>{open&&(album.length?content:<p>Chưa có hình trong bộ sưu tập.</p>)}</div>
      </section>;
    })}
    {!games.some(game=>['puzzle','jigsaw','onet','miner'].includes(game.id))&&<p>Chưa có bộ sưu tập đang mở.</p>}
  </main>;
}
