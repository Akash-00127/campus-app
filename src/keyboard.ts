// Returns the scroll position needed to keep the focused field inside the visible viewport.
export function focusedScrollOffset(offset:number,top:number,height:number,viewportTop:number,viewportHeight:number,keyboardTop=Infinity){
 const bottom=Math.min(viewportTop+viewportHeight,keyboardTop)-20;
 if(top+height>bottom)return Math.max(0,offset+top+height-bottom);
 if(top<viewportTop+12)return Math.max(0,offset+top-viewportTop-12);
 return offset;
}
