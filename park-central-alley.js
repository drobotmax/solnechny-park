// Central avenue reconstructed from a complete user panorama sweep.
(function(root){
'use strict';
const Gardens=typeof module!=='undefined'&&module.exports?require('./park-avenue-gardens.js'):root.ParkAvenueGardens;
const C={white:[.89,.87,.79],red:[.73,.14,.13],yellow:[.91,.66,.16],blue:[.12,.43,.64],dark:[.13,.17,.17],green:[.15,.34,.16],wood:[.42,.27,.16]};
const axis=[[11.51,-390.42],[19.06,-369.17],[27.6,-327.78],[36.04,-295],[41,-274]],sidePath=[[27.6,-327.78],[43.66,-331.76],[46.42,-332.45],[82.6,-342.02]];
const bed=[[13.8,-367],[20.4,-340.5],[20.8,-337.5],[17,-336],[9,-337],[4,-363]];
const trees=[[30.3,-347,15,5.5],[32,-331.5,16,6],[37,-313,15,5.5],[17.2,-343,15,6],[22,-319,15,5.5],[9,-340.4,16,5.7],[4,-320,15,6]].concat(Gardens.trees);
const flags=[[13.6,-367],[24.4,-369.2],[36.4,-315]];
const westBed=[[20.5,-329],[27,-304],[22.5,-301],[16.2,-324]],westPath=[[26,-334],[20,-335.3],[11,-336],[-3,-334.5],[-16,-337.5]];
const kiddie=[15,-330.5],westFlag=[21.5,-328.4],shutter=[6,-340.2];
const portalPosts=[-341,-345].flatMap(z=>[-6,-.5,5,10.5,16].map(x=>[x,z]));
function nearest(line,x,z){let best={distance:1e9,s:0};let acc=0;for(let i=1;i<line.length;i++){
 const a=line[i-1],b=line[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(len*len))),distance=Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);
 if(distance<best.distance)best={distance,s:acc+len*u};acc+=len;}return best;}
function inside(p,x,z){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;}
function circle(x,z,r,n=24){return Array.from({length:n},(_,i)=>[x+Math.cos(i*Math.PI*2/n)*r,z+Math.sin(i*Math.PI*2/n)*r]);}
function clearsTree(x,z){return Gardens.clearsTree(x,z)||z> -380&&z< -275&&(nearest(axis,x,z).distance<5.1||nearest(sidePath,x,z).distance<2.8||nearest(westPath,x,z).distance<2.3||inside(bed,x,z)||inside(westBed,x,z)||Math.hypot(x-kiddie[0],z-kiddie[1])<3.8||(x>8&&x<22&&z> -333&&z< -318)||trees.some(t=>Math.hypot(x-t[0],z-t[1])<2.6));}
function frame(g,x,z,a=0){
 const c=Math.cos(a),s=Math.sin(a),at=(u,y,v)=>[x+c*u-s*v,y,z+s*u+c*v];
 const quad=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat),tri=(a,b,c,col,mat=7)=>g.tri(at(...a),at(...b),at(...c),col,mat);
 const beam=(a,b,r,col=C.white,mat=7,n=4)=>g.beam(at(...a),at(...b),r,col,mat,n);
 function box(u,y,v,w,h,d,col,mat=7){const p=[[u-w/2,y,v-d/2],[u+w/2,y,v-d/2],[u+w/2,y,v+d/2],[u-w/2,y,v+d/2]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}quad([u-w/2,y+h,v-d/2],[u-w/2,y+h,v+d/2],[u+w/2,y+h,v+d/2],[u+w/2,y+h,v-d/2],col,mat);}
 function cone(u,y,v,r,h,col,n=12,rTop=0,mat=7){for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,p=(a,rr,yy)=>[u+Math.cos(a)*rr,yy,v+Math.sin(a)*rr];
  if(rTop)quad(p(a,r,y),p(b,r,y),p(b,rTop,y+h),p(a,rTop,y+h),col,mat);else tri(p(a,r,y),p(b,r,y),[u,y+h,v],col,mat);}}
 function oval(u,y,v,rx,ry,rz,col,mat=7){const p=(i,j)=>{const a=i*Math.PI/4,b=-Math.PI/2+j*Math.PI/4;return [u+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,v+Math.sin(a)*Math.cos(b)*rz];};for(let j=0;j<4;j++)for(let i=0;i<8;i++)quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
 return {at,quad,tri,beam,box,cone,oval};
}
function flower(t,x,y,z,col){for(let i=0;i<5;i++){const a=i*Math.PI*.4,dx=Math.cos(a)*.12,dz=Math.sin(a)*.12;t.quad([x,y-.01,z],[x+dx-dz*.45,y+.03,z+dz+dx*.45],[x+dx*1.4,y,z+dz*1.4],[x+dx+dz*.45,y-.025,z+dz-dx*.45],col);}t.cone(x,y+.02,z,.035,.035,C.yellow,6);}
function fence(t,r,col){for(let i=0;i<40;i++){const a=i*Math.PI/20,b=(i+1)*Math.PI/20,p=(a,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
 t.beam(p(a,.1),p(a,1.05),.025,col);for(const y of [.16,.95])t.beam(p(a,y),p(b,y),.023,col);}}
function deck(t,r,col){t.cone(0,.025,0,r,.15,col,32,r);for(let i=0;i<32;i++)t.tri([0,.18,0],[Math.cos(i*Math.PI/16)*r,.18,Math.sin(i*Math.PI/16)*r],[Math.cos((i+1)*Math.PI/16)*r,.18,Math.sin((i+1)*Math.PI/16)*r],col);}
function car(t,col){
 t.box(0,.37,0,1.10,.34,1.8,col);t.box(0,.67,.49,1.07,.25,.70,col);t.box(0,.66,-.64,1.04,.19,.48,col);
 t.box(0,.72,.1,.89,.14,.63,C.dark);t.box(0,.80,.38,.91,.37,.10,C.dark);
 for(const x of [-.56,.56])for(const z of [-.58,.58]){
  t.beam([x-.07,.37,z],[x+.07,.37,z],.23,C.dark,7,10);t.beam([x-.08,.37,z],[x+.08,.37,z],.12,[.75,.76,.70],7,8);
 }
 for(const x of [-.34,.34]){t.box(x,.68,-.90,.20,.13,.025,C.white);t.box(x,.57,.91,.17,.10,.02,C.red);}
 t.beam([-.46,1.02,-.38],[.46,1.02,-.38],.027,C.white);t.beam([-.46,.84,-.40],[-.46,1.02,-.38],.025,C.white);t.beam([.46,.84,-.40],[.46,1.02,-.38],.025,C.white);
 t.beam([.22,.84,-.14],[.22,1.03,-.25],.04,C.dark);
}
function carCarousel(g,e){
 const t=frame(g,e.cx,e.cz);deck(t,4.75,[.30,.32,.30]);fence(t,5.1,[.15,.26,.21]);
 t.box(0,.18,0,1.4,3.45,1.4,C.red);t.box(0,3.15,0,1.9,.48,1.65,C.blue);t.cone(0,3.63,0,1.13,.65,C.blue,12);
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const q=frame(g,e.cx,e.cz,a);q.quad([-.48,1.82,-.72],[.48,1.82,-.72],[.48,3.04,-.72],[-.48,3.04,-.72],[.18,.53,.69],3);
  q.box(0,1.10,-.74,.36,.44,.03,C.yellow);q.box(0,3.21,-.87,.55,.10,.025,C.white);
  q.oval(0,2.40,-.75,.23,.43,.035,[.28,.65,.79],10);q.oval(0,1.30,-.78,.15,.15,.035,[.92,.74,.23],10);
  for(const u of [-.42,.42])q.beam([u,1.85,-.75],[u,2.99,-.75],.025,C.white);
 }
 t.box(-.38,4.28,0,.42,.21,.44,[.95,.52,.09]);t.box(.38,4.28,0,.42,.21,.44,C.red);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,px=e.cx+Math.cos(a)*3.45,pz=e.cz+Math.sin(a)*3.45;
  t.beam([Math.cos(a)*.5,.60,Math.sin(a)*.5],[Math.cos(a)*3.2,.44,Math.sin(a)*3.2],.075,C.red);
  car(frame(g,px,pz,a+Math.PI/2),[C.blue,C.yellow,[.84,.31,.10]][i%3]);
 }
}
function toyCarousel(g,e){
 const t=frame(g,e.cx,e.cz);deck(t,4.5,[.37,.29,.25]);fence(t,4.9,[.16,.27,.20]);
 t.cone(0,.18,0,.48,2.8,C.red,12,.48);
 for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,p=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
  t.tri(p(a,3.9,2.85),p(b,3.9,2.85),[0,4.05,0],i%3===0?C.yellow:i%3===1?C.red:C.blue);
  t.quad(p(a,3.9,2.6),p(b,3.9,2.6),p(b,3.9,2.85),p(a,3.9,2.85),i%2?C.yellow:C.red);
 }
 for(let i=0;i<8;i++){const a=i*Math.PI/4,q=frame(g,e.cx+Math.cos(a)*2.9,e.cz+Math.sin(a)*2.9,a);
  q.box(0,.36,0,1.12,.48,.92,i%2?C.red:C.yellow);q.box(0,.85,.29,.99,.43,.13,C.blue);
  t.beam([0,2.95,0],[Math.cos(a)*3.4,2.84,Math.sin(a)*3.4],.04,C.yellow);
 }
 // A playful purple figure above the parasol is visible in the panorama.
 t.cone(0,4.04,0,.30,.76,[.34,.18,.43],10,.20);t.cone(0,4.80,0,.23,.40,[.44,.26,.51],10,.09);
 t.cone(0,5.18,0,.26,.16,[.79,.77,.68],12);t.beam([-.17,4.55,0],[-.45,4.29,.02],.075,[.34,.18,.43]);
}
function weddingCarousel(g,e){
 const t=frame(g,e.cx,e.cz);deck(t,2.85,[.69,.42,.28]);fence(t,3.15,C.red);t.cone(0,.18,0,.85,3.05,C.white,12,.85);
 for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,p=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
  t.tri(p(a,3.58,3.36),p(b,3.58,3.36),[0,5.55,0],i%4<2?[.93,.81,.42]:[.77,.30,.25]);
  t.quad(p(a,3.58,3.10),p(b,3.58,3.10),p(b,3.58,3.49),p(a,3.58,3.49),C.white);
  if(i%2===0)t.cone(Math.cos(a)*3.12,3.45,Math.sin(a)*3.12,.35,.65,C.blue,10);
 }
 for(let i=0;i<8;i++){const a=i*Math.PI/4,q=frame(g,e.cx+Math.cos(a)*2.2,e.cz+Math.sin(a)*2.2,a);
  q.beam([0,.20,0],[0,3.25,0],.026,C.yellow);q.oval(0,1.02,0,.51,.23,.19,C.white);q.beam([.30,1.06,0],[.40,1.48,0],.13,C.white,7,8);
  q.oval(.45,1.53,0,.27,.15,.14,C.white);q.box(-.04,1.23,0,.38,.06,.32,C.red);
  for(const x of [-.30,.30])q.beam([x,.88,0],[x+.10,.37,0],.05,C.white);
  const u=Math.cos(a)*3.62,v=Math.sin(a)*3.62;t.cone(u,3.25,v,.18,.16,[.85,.63,.17],8,.09);
 }
 t.cone(0,5.52,0,.16,.50,C.red,10);
}
const glyphs={
 'Х':[[0,0,1,1],[0,1,1,0]],'О':[[0,0,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0]],'Т':[[0,1,1,1],[.5,1,.5,0]],'-':[[.15,.5,.85,.5]],
 'Д':[[0,0,.18,.1],[.18,.1,.35,1],[.35,1,.85,1],[.85,1,.85,.1],[0,.1,1,.1],[1,.1,1,0]],'Г':[[0,0,0,1],[0,1,1,1]],'К':[[0,0,0,1],[0,.45,1,1],[0,.45,1,0]],
 'А':[[0,0,.5,1],[.5,1,1,0],[.2,.4,.8,.4]],'С':[[1,1,0,1],[0,1,0,0],[0,0,1,0]],'И':[[0,0,0,1],[0,0,1,1],[1,1,1,0]],'Р':[[0,0,0,1],[0,1,1,1],[1,1,1,.5],[1,.5,0,.5]],'Е':[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]]};
function label(t,word,x,y,z,h,col,direction=1){const w=h*.57,gap=h*.23,start=-word.length*(w+gap)/2;for(let i=0;i<word.length;i++)for(const [a,b,c,d] of glyphs[word[i]]||[])t.beam([x+direction*(start+i*(w+gap)+a*w),y+b*h,z],[x+direction*(start+i*(w+gap)+c*w),y+d*h,z],h*.035,col,7,4);}
function booth(g,e){const t=frame(g,e.cx,e.cz);t.box(0,.03,0,1.6,1.9,1.6,C.wood,12);t.box(0,1.93,0,1.95,.16,1.95,C.red);t.quad([-.62,.70,-.815],[.62,.70,-.815],[.62,1.67,-.815],[-.62,1.67,-.815],C.blue,3);}
function cafe(g,e){
 const p=e.pts,t=frame(g,0,0),wood=C.wood,top=2.72;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];t.quad([a[0],.03,a[1]],[b[0],.03,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],wood,12);}
 // The L-shaped mapped body stays low behind the outdoor terrace.
 for(const part of [[0,1,4,5],[1,2,3,4]]){const v=part.map(i=>[p[i][0],top,p[i][1]]);t.quad(...v,[.27,.22,.18],14);}
 const a=[44,-284],b=[37,-316],ang=Math.atan2(b[1]-a[1],b[0]-a[0]),s=frame(g,a[0],a[1],ang),len=Math.hypot(b[0]-a[0],b[1]-a[1]);
 s.box(len/2,.015,3.1,len,.055,6.2,[.43,.37,.29],1);
 for(let u=1.4;u<len;u+=4.6){
  s.box(u,.035,0,3.4,.60,.65,C.white);for(let h=.15;h<.6;h+=.15)s.beam([u-1.66,h,-.34],[u+1.66,h,-.34],.014,[.68,.69,.61]);
  const world=s.at(u,0,3),q=frame(g,world[0],world[2]);
  q.beam([0,.07,0],[0,3.15,0],.04,[.64,.62,.53]);
  for(let i=0;i<8;i++){const v=i*Math.PI/4,w=(i+1)*Math.PI/4;q.tri([Math.cos(v)*3.15,2.72,Math.sin(v)*3.15],[Math.cos(w)*3.15,2.72,Math.sin(w)*3.15],[0,3.45,0],i%2?[.86,.85,.78]:[.96,.94,.87]);}
  for(const v of [1.8,4.5]){s.box(u,.74,v,1.6,.10,.90,wood,12);for(const n of [-.72,.72])s.beam([u+n,.05,v],[u+n,.73,v],.035,C.dark);for(const dv of [-.82,.82]){s.box(u,.43,v+dv,1.7,.10,.36,wood,12);s.box(u,.68,v+dv,1.7,.36,.055,wood,12);}}
 }
 // A west-facing counter and a freestanding ice-cream cone mark the near corner.
 const q=frame(g,51,-314,Math.PI/2);q.box(0,.40,0,4.0,1.85,.16,C.dark);q.box(0,2.27,-.04,4.5,.48,.23,C.red);label(q,'ХОТ-ДОГ',0,2.34,-.18,.30,C.white);
 // Game counters occupy the north wing beside the hot-dog corner.
 arcade(g,{pts:[p[1],[p[1][0]+(p[2][0]-p[1][0])*.54,p[1][1]+(p[2][1]-p[1][1])*.54]]});
 const ice=frame(g,40,-316);ice.cone(0,.05,0,.07,1.14,[.80,.56,.25],10,.30);for(let i=0;i<4;i++)ice.cone(0,1.12+i*.14,0,.34-i*.065,.22,i%2?C.white:C.red,10);
 Gardens.cafeDetails(g);
}
function arcade(g,e){const a=e.pts[0],b=e.pts[1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=frame(g,a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0]));
 t.box(len/2,.03,2.2,len,2.55,4.4,C.dark);t.box(len/2,2.53,1.9,len+.5,.22,5.0,[.24,.19,.16]);t.box(len/2,2.15,-.20,len,.48,.30,C.red);label(t,'ИГРОТЕКА',len/2,2.25,-.38,.26,C.yellow,-1);
 for(let u=.6;u<len-.3;u+=.72){const col=[C.blue,C.yellow,C.red][Math.round(u*5)%3];t.box(u,.10,-.05,.45,.50,.55,col);t.cone(u,.62,-.08,.22,.39,col,8,.11);t.cone(u,1.04,-.08,.23,.28,C.white,8);}
}
function airFrame(e){const a=e.pts[0],b=e.pts[1];return {x:a[0],z:a[1],angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}
function airPosts(e){const f=airFrame(e),c=Math.cos(f.angle),s=Math.sin(f.angle),points=[];
 for(const u of [0,3.7,7.4,11.8])for(const v of [0,-6.5]){const p=[f.x+c*u-s*v,f.z+s*u+c*v];if(Math.hypot(p[0]-kiddie[0],p[1]-kiddie[1])>3.1)points.push(p);}
 return points;
}
function airStairs(e){const f=airFrame(e),c=Math.cos(f.angle),s=Math.sin(f.angle);return [[10.1,-10.05],[11.5,-10.05],[11.5,-6.95],[10.1,-6.95]].map(([u,v])=>[f.x+c*u-s*v,f.z+s*u+c*v]);}
function airTrack(g,e){
 const f=airFrame(e),t=frame(g,f.x,f.z,f.angle),steel=[.27,.31,.29],turquoise=[.10,.53,.53];
 // The attraction is a raised cage; the ground below remains open between posts.
 for(const [x,z] of airPosts(e)){const p=frame(g,x,z);p.beam([0,.02,0],[0,3.18,0],.085,turquoise,7,8);}
 for(const v of [0,-6.5])t.beam([0,3.15,v],[11.8,3.15,v],.10,turquoise);
 t.box(7.4,3.02,-3.25,8.8,.22,6.5,[.68,.68,.60],1);
 t.quad([3,3.02,0],[11.8,3.02,0],[11.8,3.02,-6.5],[3,3.02,-6.5],[.32,.34,.31],2);
 const ring=[[3,0],[11.8,0],[11.8,-6.5],[3,-6.5]];
 for(let j=0;j<4;j++){const a=ring[j],b=ring[(j+1)%4],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(const y of [3.30,4.25,5.50])t.beam([a[0],y,a[1]],[b[0],y,b[1]],.025,steel);
  for(let s=0;s<=len;s+=.38){const u=s/len;t.beam([a[0]+(b[0]-a[0])*u,3.25,a[1]+(b[1]-a[1])*u],[a[0]+(b[0]-a[0])*u,5.51,a[1]+(b[1]-a[1])*u],.013,steel);}
 }
 // A shallow barrel roof and visible coloured vehicles identify the upper level.
 for(let i=0;i<8;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,p=(u,a)=>[u,5.48+Math.sin(a)*.70,-3.25+Math.cos(a)*3.50];t.quad(p(2.65,a),p(12.15,a),p(12.15,b),p(2.65,b),[.37,.41,.42],14);}
 for(const u of [4.3,7.1,9.9]){t.box(u,3.29,-2.5,.80,.60,1.25,[.75,.19,.13]);t.box(u,3.88,-2.5,.70,.21,.48,C.yellow);t.beam([u,4.12,-2.5],[u,5.35,-2.5],.025,steel);}
 // Access steps stay at the far end, away from the public cross passage.
 for(let i=0;i<12;i++)t.box(10.8, i*.255,-9.74+i*.24,1.2,.255,.25,[.40,.43,.42],2);
 for(const u of [10.14,11.46])t.beam([u,1.0,-9.92],[u,4.0,-7.10],.035,steel);
}
function kiddieCarousel(g,e){const t=frame(g,e.cx,e.cz);deck(t,2.70,[.36,.35,.29]);fence(t,2.80,[.10,.34,.27]);
 t.cone(0,.18,0,.48,1.32,C.yellow,12,.48);t.oval(0,1.78,0,.46,.55,.38,C.white);
 for(const x of [-.21,.21]){t.beam([x,2.13,0],[x*1.40,2.93,0],.105,C.white,7,8);t.oval(x,1.93,-.35,.06,.08,.025,C.dark);}
 t.oval(0,1.70,-.40,.19,.11,.08,[.87,.39,.40]);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,col=[C.white,[.76,.39,.50],[.38,.67,.47]][i%3],q=frame(g,e.cx+Math.cos(a)*1.63,e.cz+Math.sin(a)*1.63,a+Math.PI/2);
  t.beam([0,.56,0],[Math.cos(a)*1.65,.56,Math.sin(a)*1.65],.06,C.yellow);
  if(i%2===0){q.box(0,.42,0,.63,.29,.97,col);q.box(0,.70,.26,.63,.23,.25,col);for(const x of [-.34,.34])for(const z of [-.28,.28])q.beam([x-.035,.40,z],[x+.035,.40,z],.14,C.dark,7,8);}
  else {q.oval(0,.56,0,.40,.25,.60,col);q.box(0,.69,.22,.48,.25,.12,C.blue);q.beam([-.53,.52,0],[.53,.52,0],.07,col);}
 }
}
function serviceKiosk(g,e){const a=e.pts[0],b=e.pts[1],t=frame(g,e.cx,e.cz,Math.atan2(b[1]-a[1],b[0]-a[0]));
 t.box(0,.03,0,3.6,2.50,2.6,[.84,.85,.78],1);t.box(0,2.53,0,4.1,.24,3.0,C.blue);
 for(const v of [-1.32,1.32]){t.quad([-1.55,.86,v],[1.55,.86,v],[1.55,2.13,v],[-1.55,2.13,v],[.42,.61,.64],3);for(const u of [-1.55,0,1.55])t.beam([u,.86,v],[u,2.13,v],.04,C.white);}
}
function shrub(t,x,z,r,col=C.green){t.oval(x,.25+r*.27,z,r,r*.42,r*.86,col,16);}
function hydrangea(t,x,z,r){shrub(t,x,z,r);for(let i=0;i<8;i++){const a=i*2.4,dx=Math.cos(a)*r*.65,dz=Math.sin(a)*r*.60;t.oval(x+dx,.45+r*.37+Math.sin(i)*.12,z+dz,.18,.12,.17,i%3?[.88,.85,.69]:[.83,.57,.61]);}}
function westGarden(g){const t=frame(g,0,0);
 for(let i=0;i<westBed.length;i++){const a=westBed[i],b=westBed[(i+1)%westBed.length];t.beam([a[0],.20,a[1]],[b[0],.20,b[1]],.20,[.58,.48,.36],1);t.beam([a[0],.41,a[1]],[b[0],.41,b[1]],.065,C.white,1);}
 for(let i=1;i<westBed.length-1;i++)t.tri([westBed[0][0],.04,westBed[0][1]],[westBed[i][0],.04,westBed[i][1]],[westBed[i+1][0],.04,westBed[i+1][1]],[.24,.36,.18],16);
 for(let i=0;i<5;i++){const x=20.8+i*1.10,z=-324+i*4.6,h=4.1+i%2*.8;t.cone(x,.20,z,.82,h,[.09,.25,.13],16,.04,16);
 }
 for(let i=0;i<28;i++){const u=i/27,x=20.1+6.5*u,z=-327+22.4*u;shrub(t,x,z,.32);flower(t,x,.48,z,i%3?C.yellow:C.white);}
 for(const [x,z,r] of [[19.9,-326.1,1.05],[22,-324.7,.7],[24.0,-311.8,.8],[19.1,-338.5,1.1],[16.9,-341,.85]])hydrangea(t,x,z,r);
 // A narrow shaded cross path and benches continue behind the corner sculpture.
 for(const [x,z] of [[7,-331.2],[-1,-331.5],[-11,-333.0]]){const q=frame(g,x,z);q.box(0,.44,0,1.9,.09,.44,C.wood,12);q.box(0,.53,.20,1.9,.48,.06,C.wood,12);for(const u of [-.7,.7])q.beam([u,.02,0],[u,.45,0],.045,C.dark);}
 const q=frame(g,...westFlag);q.cone(0,.02,0,.75,.28,[.76,.76,.69],4,.28);for(let i=0;i<3;i++){const x=(i-1)*.43;q.quad([x-.26,.30,0],[x+.26,.30,0],[x+.50,4.25+i*.25,-.14],[x-.02,4.60+i*.25,-.14],[C.blue,C.red,[.16,.44,.34]][i]);}
 // Thin turquoise portal frames stay open across the lawn, as in the new views.
 for(const z of [-341,-345]){for(let x=-6;x<=16;x+=5.5){t.beam([x,.02,z],[x,2.90,z],.055,[.10,.53,.53]);if(x<16)t.beam([x,2.90,z],[x+5.5,2.90,z],.055,[.10,.53,.53]);}}
 const k=frame(g,...shutter);k.box(0,.03,0,2.4,2.45,2.0,[.52,.55,.55],2);k.box(0,2.47,0,2.7,.16,2.35,C.white);for(let y=.20;y<2.4;y+=.14)k.beam([-1.05,y,-1.02],[1.05,y,-1.02],.014,[.72,.73,.70]);
}
function avenue(g){const t=frame(g,0,0);
 // The mature tree stands in a small grass corner between the two paths.
 for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10,p=(a,y)=>[32+Math.cos(a)*1.2,y,-331.5+Math.sin(a)*1.05];
  t.tri([32,.025,-331.5],p(a,.025),p(b,.025),[.25,.40,.20],16);t.beam(p(a,.10),p(b,.10),.07,[.65,.65,.58],1);
 }
 // Low stone border, white gravel, clipped evergreens and seasonal flowers.
 for(let i=0;i<bed.length;i++){const a=bed[i],b=bed[(i+1)%bed.length];t.beam([a[0],.18,a[1]],[b[0],.18,b[1]],.18,[.59,.50,.40],1,4);t.beam([a[0],.38,a[1]],[b[0],.38,b[1]],.08,C.white,1,4);}
 const f=frame(g,13,-351.5,-.23);f.box(0,.015,0,10,.035,27,[.86,.86,.78],1);
 for(let i=0;i<5;i++){const x=8+i*2.15,z=-361+i*5.5,h=4.6+(i%2)*.8;t.cone(x,.14,z,.91,h,[.09,.26,.12],16,.035,16);
  for(let j=0;j<32;j++){const y=.3+j*h/34,a=j*2.4,r=.90*(1-y/(h+.3));t.quad([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(a+.34)*(r+.12),y-.12,z+Math.sin(a+.34)*(r+.12)],[x+Math.cos(a+.08)*(r+.04),y+.21,z+Math.sin(a+.08)*(r+.04)],[x+Math.cos(a-.22)*r,y-.10,z+Math.sin(a-.22)*r],[.12,.29,.14],16);}
 }
 for(let i=0;i<66;i++){const u=i/65,x=14.0+6.6*u,z=-365+27*u;if(i%3===0)t.oval(x-.75,.35,z,.54,.30,.75,C.green,16);flower(t,x,.43,z,i%3===0?C.white:i%3===1?C.yellow:[.80,.32,.15]);}
 // Narrow dark mesh fences and benches border the ride strip.
 for(const [a,b] of [[[26.7,-359],[30,-344]],[[30,-344],[31,-334]]]){
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<=len;s+=.55){const u=s/len,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;t.beam([x,.08,z],[x,1.0,z],.015,[.11,.20,.16]);}
  for(const y of [.12,.98])t.beam([a[0],y,a[1]],[b[0],y,b[1]],.026,[.11,.20,.16]);
 }
 for(const [x,z] of [[34.5,-332.5],[41.5,-333.8],[53,-330]]){const q=frame(g,x,z);q.box(0,.46,0,2.05,.08,.44,C.wood,12);q.box(0,.55,.21,2.05,.48,.055,C.wood,12);for(const u of [-.8,.8])q.beam([u,.04,0],[u,.46,0],.045,C.dark);}
 for(const [x,z] of flags){const q=frame(g,x,z);q.cone(0,.02,0,.75,.28,[.76,.76,.69],4,.28);
  for(let i=0;i<3;i++){const dx=(i-1)*.42,y=3.6+i*.36;q.quad([dx-.30,.30,0],[dx+.30,.30,0],[dx+.48,y,-.09],[dx+.08,y+.42,-.09],[C.blue,C.red,[.16,.44,.34]][i]);}
 }
 for(const x of [18.2,22.0,25.8])for(let j=0;j<5;j++)for(let i=0;i<10;i++){
  const at=(i,j)=>{const a=i*Math.PI/5,b=-Math.PI/2+j*Math.PI/5;return [x+Math.cos(a)*Math.cos(b)*.33,.35+Math.sin(b)*.33,-367+Math.sin(a)*Math.cos(b)*.33];};
  t.quad(at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1),[.71,.70,.62]);
 }
}
function footprint(e){if(e.kind==='kiddieCarousel')return circle(e.cx,e.cz,2.80);if(e.kind==='weddingCarousel')return circle(e.cx,e.cz,3.15);if(e.kind==='serviceKiosk'){const a=e.pts[0],b=e.pts[1],angle=Math.atan2(b[1]-a[1],b[0]-a[0]),c=Math.cos(angle),s=Math.sin(angle);return [[-1.8,-1.3],[1.8,-1.3],[1.8,1.3],[-1.8,1.3]].map(([u,v])=>[e.cx+c*u-s*v,e.cz+s*u+c*v]);}if(e.kind==='rideBooth')return [[e.cx-.8,e.cz-.8],[e.cx+.8,e.cz-.8],[e.cx+.8,e.cz+.8],[e.cx-.8,e.cz+.8]];return e.pts;}
function applyGround(cats,park,entries){
 const targets=entries.filter(e=>['toyCarousel','carCarousel','weddingCarousel','kiddieCarousel','serviceKiosk','alleyCafe','arcade','rideBooth'].includes(e.kind)),air=entries.find(e=>e.kind==='airTrack'),posts=portalPosts.concat(air?airPosts(air):[]),stairs=air?airStairs(air):[],bounds=[-380,-275];
 for(let iz=Math.max(0,Math.floor((bounds[0]-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((bounds[1]-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((-13-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((89-park.x0)/park.mpp));ix++){
  const index=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,old=cats[index]&31;
  if(old===5&&targets.some(e=>['rideBooth','serviceKiosk'].includes(e.kind)&&inside(e.pts,x,z)))cats[index]=75;
  if(old===12&&(targets.some(e=>e.kind==='kiddieCarousel'&&inside(e.pts,x,z))||(air&&inside(air.pts,x,z))))cats[index]=65;
  if(![4,5,12,13].includes(cats[index]&31)&&(nearest(axis,x,z).distance<4.5||nearest(sidePath,x,z).distance<1.6))cats[index]=67;
  if(inside(bed,x,z))cats[index]=77;
  if(![4,5,12,13].includes(cats[index]&31)&&nearest(westPath,x,z).distance<1.6)cats[index]=67;
  if(x>9&&x<24.5&&z> -337&&z< -326.5&&![4,5,12,13].includes(cats[index]&31))cats[index]=67;
  if(inside(westBed,x,z))cats[index]=77;
  for(const e of targets)if(inside(footprint(e),x,z))cats[index]=64|(['rideBooth','serviceKiosk','alleyCafe','arcade'].includes(e.kind)?5:12);
  // White planter boxes separate the cafe seating from the public avenue.
  if(z> -315&&z< -284&&Math.abs(x-(37+(z+316)*7/32))<.45)cats[index]=77;
  if(flags.some(p=>Math.hypot(x-p[0],z-p[1])<.65)||[18.2,22.0,25.8].some(b=>Math.hypot(x-b,z+367)<.38))cats[index]=77;
  if(((x-32)/1.2)**2+((z+331.5)/1.05)**2<1)cats[index]=77;
  if(Math.hypot(x-westFlag[0],z-westFlag[1])<.65||posts.some(p=>Math.hypot(x-p[0],z-p[1])<.30))cats[index]=77;
  if(stairs.length&&inside(stairs,x,z))cats[index]=77;
  if(Math.abs(x-shutter[0])<1.2&&Math.abs(z-shutter[1])<1.0)cats[index]=69;
 }
 Gardens.applyGround(cats,park);
}
const api={axis,bed,westBed,westPath,kiddie,trees,clearsTree,carCarousel,toyCarousel,weddingCarousel,kiddieCarousel,airTrack,airPosts,airStairs,serviceKiosk,westGarden,cafe,arcade,booth,avenue,footprint,applyGround,mainGarden:Gardens.garden,continuationBed:Gardens.bed};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkCentralAlley=api;
})(typeof window!=='undefined'?window:globalThis);
