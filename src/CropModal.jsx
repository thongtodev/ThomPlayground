import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';

/** Keep crop controls in the viewport even when opened from a long album grid. */
export default function CropModal({onClose,children}){
 const dialog=useRef(null);
 useEffect(()=>{
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}};
  window.addEventListener('keydown',onKey);
  dialog.current?.focus();
  return()=>{document.body.style.overflow=oldOverflow;window.removeEventListener('keydown',onKey);};
 },[onClose]);
 return createPortal(<div className="crop-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="crop-modal-dialog" role="dialog" aria-modal="true" aria-label="Chỉnh vùng crop ảnh" tabIndex={-1} ref={dialog}>
   {children}
  </div>
 </div>,document.body);
}
