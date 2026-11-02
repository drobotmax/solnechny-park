// Suspension footbridge OSM 46869602; photo-led proportions, not a survey.
(function(root){
'use strict';
const a=[-14.16,432.42],b=[-41.6,471.92],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
const width=2.2,missing=[19,43,78,109,137],pitch=.31;
// The two road/footpath openings marked by the user beside the bridgehead.
const fenceGaps=[{x:7,z:440,r:6,cat:3},{x:11.5,z:409.6,r:3.5,cat:2}];
function fenceGap(x,z){return fenceGaps.find(p=>Math.hypot(x-p.x,z-p.z)<p.r);}
function local(x,z){return {s:(x-a[0])*dx+(z-a[1])*dz,l:(x-a[0])*dz-(z-a[1])*dx};}
function at(s,l,y){return [a[0]+dx*s+dz*l,y,a[1]+dz*s-dx*l];}
function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function deck(s){return .55+.70*Math.pow(2*Math.max(0,Math.min(1,s/length))-1,2);}
function height(x,z){
 const {s,l}=local(x,z);
 if(s>=-2&&s<=.5&&l>=1.1&&l<=5.2)return 1.25*(1-smooth((l-1.6)/3.6));
 if(s< -8||s>length+6||Math.abs(l)>1.65)return null;
 return s<0?1.25*smooth((s+8)/6):s>length?1.25*(1-smooth((s-length)/6)):deck(s);
}
function surface(x,z){
 const {s,l}=local(x,z);
 if(s>=-2.4&&s<=.7&&l>=1&&l<=6)return 2;
 if(s< -9||s>length+7)return null;
 if(s<0||s>length)return Math.abs(l)<1.65?2:null;
 if(Math.abs(l)<=width/2)return 2;
 return Math.abs(l)<1.55?13:null;
}
function clearsTree(x,z){const {s,l}=local(x,z);return (s> -9&&s<length+7&&Math.abs(l)<2.1)||(s> -3&&s<1.2&&l>0&&l<6.5);}
function entries(){const c=at(length/2,0,0);return [{id:'suspension-bridge',kind:'suspensionBridge',cx:c[0],cz:c[2]}];}
function applyGround(cats,park){
 for(const p of fenceGaps){
  for(let iz=Math.max(0,Math.floor((p.z-p.r-park.z0)/park.mpp));iz<Math.min(park.h,Math.ceil((p.z+p.r-park.z0)/park.mpp));iz++)
  for(let ix=Math.max(0,Math.floor((p.x-p.r-park.x0)/park.mpp));ix<Math.min(park.w,Math.ceil((p.x+p.r-park.x0)/park.mpp));ix++){
   const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,i=iz*park.w+ix;
   if(Math.hypot(x-p.x,z-p.z)<p.r&&(cats[i]&31)===13)cats[i]=64|p.cat;
  }
 }
 for(let iz=Math.max(0,Math.floor((a[1]-12-park.z0)/park.mpp));iz<Math.min(park.h,Math.ceil((b[1]+12-park.z0)/park.mpp));iz++)
 for(let ix=Math.max(0,Math.floor((b[0]-12-park.x0)/park.mpp));ix<Math.min(park.w,Math.ceil((a[0]+12-park.x0)/park.mpp));ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,{s,l}=local(x,z),i=iz*park.w+ix;
  // Keep water visible below missing planks; navigation uses the analytic deck.
  if(s>1&&s<length-1&&Math.abs(l)<1.6)cats[i]=64|4;
  else if(surface(x,z)===2)cats[i]=64|2;
 }
}
function build(g){
 const steel=[.19,.18,.15],cable=[.27,.24,.18],concrete=[.52,.52,.47];
 const beam=(s,l,y,t,m,v,r,c)=>g.beam(at(s,l,y),at(t,m,v),r,c||cable,2,6);
 const n=Math.ceil(length/pitch);
 for(let i=0;i<n;i++){
  if(missing.includes(i))continue;
  const s=i*pitch,t=Math.min(length,(i+1)*pitch-.018),edge=width/2+.035*Math.sin(i*7.3),shift=.035*Math.sin(i*3.1);
  const col=[.43,.40,.33].map((c,k)=>c+(.035*Math.sin(i*2.7))+(k===2?.01:0));
  const p=[at(s,-edge+shift,deck(s)),at(t,-edge+shift,deck(t)),at(t,edge+shift,deck(t)),at(s,edge+shift,deck(s))];
  g.quad(...p,col,4);
  for(let j=0;j<4;j++){const k=(j+1)%4;g.quad(p[k],p[j],[p[j][0],p[j][1]-.075,p[j][2]],[p[k][0],p[k][1]-.075,p[k][2]],col.map(c=>c*.7),4);}
  // Long grain cracks run across each weathered plank.
  if(i%3===0)beam(s+.09,-edge+.12,deck(s+.09)+.003,s+.09,edge-.18,deck(s+.09)+.003,.004,[.25,.23,.19]);
 }
 for(const side of [-1,1]){
  const l=side*1.12;
  for(let s=0;s<length;s+=.5){
   const t=Math.min(length,s+.5),top=u=>deck(u)+1.35+1.55*Math.pow(2*u/length-1,2);
   beam(s,l,top(s),t,l,top(t),.024);
   for(const rise of [.48,.92]){
    const rail=u=>deck(u)+rise-.10*Math.sin(Math.PI*((u%2)/2));
    beam(s,l,rail(s),t,l,rail(t),.013);
   }
   beam(s,side*.94,deck(s)-.11,t,side*.94,deck(t)-.11,.025,steel);
  }
  for(let s=.4;s<length;s+=2){
   const top=deck(s)+1.35+1.55*Math.pow(2*s/length-1,2);
   beam(s,l,deck(s)-.12,s,l,top,.013,steel);
   g.box(...at(s,l,deck(s)-.13),.065,.19,.065,steel,2);
  }
 }
 for(const s of [0,length]){
  for(const l of [-1.48,1.48])beam(s,l,.05,s,l,4.5,.10,concrete);
  beam(s,-1.48,4.4,s,1.48,4.4,.09,steel);
 }
 // Concrete bridgehead, with the photographed stairs descending sideways.
 g.quad(at(-2,-1.6,1.25),at(0,-1.6,1.25),at(0,1.6,1.25),at(-2,1.6,1.25),concrete,1);
 for(let i=0;i<10;i++){
  const l=1.6+i*.36,h=1.25*(1-i/10),t=l+.36;
  g.quad(at(-2,l,h),at(.5,l,h),at(.5,t,h),at(-2,t,h),concrete,1);
  g.quad(at(-2,t,h),at(.5,t,h),at(.5,t,h-.125),at(-2,t,h-.125),[.39,.40,.36],1);
 }
 for(const s of [-2.15,.65])for(let i=0;i<10;i++){
  const l=1.6+i*.36,h=1.25*(1-i/10);
  beam(s,l,h+.25,s,l+.36,h+.125,.13,concrete);
 }
 // Short landings blend into the existing shore paths without a raised lip.
 for(const end of [0,length])for(let i=0;i<12;i++){
  const s=end===0?-8+i*6/12:length+i*6/12,t=s+.5;
  const h=u=>end===0?1.25*smooth((u+8)/6):1.25*(1-smooth((u-length)/6));
  g.quad(at(s,-1.5,h(s)),at(t,-1.5,h(t)),at(t,1.5,h(t)),at(s,1.5,h(s)),concrete,1);
 }
}
const api={a,b,length,dx,dz,width,missing,pitch,fenceGaps,fenceGap,local,at,deck,height,surface,clearsTree,entries,applyGround,build};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkSuspensionBridge=api;
})(typeof window!=='undefined'?window:globalThis);
