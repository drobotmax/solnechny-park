// Photo-led continuation at the next crossroads. Dimensions are approximate.
(function(root){
'use strict';
const C={white:[.89,.89,.83],wood:[.49,.30,.16],dark:[.12,.15,.14],blue:[.12,.40,.65],red:[.72,.18,.14],yellow:[.94,.69,.18],leaf:[.17,.34,.16]};
const avenue=[[44.3,-256],[49.2,-239],[54,-215]];
const westPath=[[48.5,-244],[42,-243],[17,-240.5],[-1,-238.5]];
const eastPath=[[48.5,-244],[57,-245.5],[74,-249],[94,-253]];
const terraceArea=[[51.4,-272],[83,-273],[89,-258],[55,-248.6]];
const gallery={x:54.3,z:-262.8,w:6,d:3.8};
const play={x:60.1,z:-231.5,w:9,d:6.2};
const wall=[[41,-234],[16,-231.6],[12,-229.2]];
const trees=[[34,-236,18,6],[57.5,-251.5,17,6],[66,-264.4,20,6]];
const umbrellas=[[59,-261],[66,-259],[74,-260],[60,-268],[72,-268],[81,-266]];
const planters=[[53,-269,1.05,2.5],[54.7,-255.4,1.05,2.4],[60.2,-251.6,2.6,.8],[65.2,-252.7,2.6,.8],[71.2,-254,2.6,.8],[77,-255.3,2.6,.8],[83,-256.5,2.6,.8]];
const pots=[[53.5,-258.6],[58,-253.6],[68,-255],[78,-258]];
const hedges=Array.from({length:14},(_,i)=>[40-i*1.8,-246.8+i*.18]);
function inside(p,x,z){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;}
function distance(p,x,z){let d=Infinity;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return d;}
function frame(g,x=0,z=0,a=0){const c=Math.cos(a),s=Math.sin(a),at=(u,y,v)=>[x+c*u-s*v,y,z+s*u+c*v];
 const q=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat);
 function box(u,y,v,w,h,d,col,mat=7){const p=[[u-w/2,y,v-d/2],[u+w/2,y,v-d/2],[u+w/2,y,v+d/2],[u-w/2,y,v+d/2]];for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];q(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}q([u-w/2,y+h,v-d/2],[u-w/2,y+h,v+d/2],[u+w/2,y+h,v+d/2],[u+w/2,y+h,v-d/2],col,mat);}
 function oval(u,y,v,rx,ry,rz,col,mat=16){const p=(i,j)=>{const a=i*Math.PI/4,b=-Math.PI/2+j*Math.PI/4;return [u+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,v+Math.sin(a)*Math.cos(b)*rz];};for(let j=0;j<4;j++)for(let i=0;i<8;i++)q(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
 return {at,q,box,oval,tri:(a,b,c,col,mat=7)=>g.tri(at(...a),at(...b),at(...c),col,mat),beam:(a,b,r,col=C.dark,mat=7,n=6)=>g.beam(at(...a),at(...b),r,col,mat,n)};
}
function planter(g,x,z,w,d){const t=frame(g,x,z);t.box(0,.07,0,w,.58,d,C.white,12);t.box(0,.66,0,w+.05,.055,d+.05,C.white,12);t.box(0,.667,0,w-.13,.025,d-.13,[.22,.25,.14]);
 for(let i=0;i<4;i++){const u=(i-1.5)*(w-.25)/4;t.oval(u,.91,0,Math.max(.22,w/7),.27,Math.min(.30,d*.42),C.leaf);for(let j=0;j<3;j++)t.oval(u+Math.sin(i+j)*.10,1.10,Math.cos(i*2+j)*d*.22,.10,.06,.10,i%2?C.white:[.77,.38,.49],7);}
}
function pot(g,x,z){const t=frame(g,x,z);t.box(0,.04,0,.57,.62,.57,[.54,.45,.32],1);t.oval(0,1.02,0,.48,.46,.48,C.leaf);for(let i=0;i<6;i++)t.oval(Math.cos(i*2.4)*.32,1.27,Math.sin(i*2.4)*.32,.14,.12,.14,i%2?C.white:[.79,.37,.48],7);}
function umbrella(g,x,z,r=2.75){const t=frame(g,x,z);t.beam([0,.05,0],[0,3.37,0],.042,[.76,.76,.68],2,8);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4,p=t=>[Math.cos(t)*r,2.62,Math.sin(t)*r];t.tri([0,3.37,0],p(a),p(b),i%2?C.white:[.82,.82,.76],17);t.q(p(a),p(b),[Math.cos(b)*r,2.44,Math.sin(b)*r],[Math.cos(a)*r,2.44,Math.sin(a)*r],C.white,17);t.beam([0,3.30,0],[Math.cos(a)*r,2.58,Math.sin(a)*r],.015,[.63,.61,.52],2,4);}
 t.box(0,.80,0,1.8,.10,.80,C.wood,12);for(const u of [-.65,.65])t.box(u,.05,0,.09,.75,.60,C.wood,12);
 for(const v of [-.93,.93]){for(let i=0;i<3;i++)t.box(0,.43,v+(i-1)*.11,2.1,.065,.085,C.wood,12);for(const u of [-.75,.75]){t.box(u,.04,v,.09,.38,.32,C.dark,2);t.box(u,.49,v+Math.sign(v)*.22,.065,.45,.07,C.wood,12);}for(let i=0;i<3;i++)t.box(0,.64+i*.11,v+Math.sign(v)*.23,2.1,.085,.055,C.wood,12);}
}
function terrace(g,e){const t=frame(g);
 // The mapped rear pavilion stays in its original footprint; the open seating extends west.
 const p=e.pts;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];t.q([a[0],.03,a[1]],[b[0],.03,b[1]],[b[0],2.55,b[1]],[a[0],2.55,a[1]],C.wood,12);}
 t.q([p[0][0]-.15,2.61,p[0][1]-.15],[p[1][0]-.15,2.61,p[1][1]-.15],[p[2][0]+.15,2.61,p[2][1]+.15],[p[3][0]+.15,2.61,p[3][1]+.15],[.22,.23,.20],14);
 for(const [x,z] of umbrellas)umbrella(g,x,z);
 for(const p of planters)planter(g,...p);for(const p of pots)pot(g,...p);
 // Small serving hatch on the west-facing wall, under the low roof.
 const f=frame(g,80.45,-266.9,Math.PI/2);f.box(0,1.02,0,2.9,1.04,.06,[.10,.13,.11]);f.box(0,.95,.13,3.18,.09,.48,C.wood,12);for(const u of [-1.53,1.53])f.box(u,.94,.04,.07,1.20,.10,C.white);f.box(0,2.11,.04,3.1,.07,.10,C.white);
}
const glyphs={'Т':[[0,1,1,1],[.5,1,.5,0]],'И':[[0,0,0,1],[0,0,1,1],[1,1,1,0]],'Р':[[0,0,0,1],[0,1,1,1],[1,1,1,.5],[1,.5,0,.5]],'П':[[0,0,0,1],[0,1,1,1],[1,1,1,0]],'О':[[0,0,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0]],'К':[[0,0,0,1],[0,.5,1,1],[0,.5,1,0]],'Н':[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]]};
function letters(t,word,y,v,h,bulbs=false){const step=h*.84,left=-(word.length-1)*step/2-h*.29;for(let i=0;i<word.length;i++)for(const [a,b,c,d] of glyphs[word[i]]||[]){const u=left+i*step;t.beam([u+a*h*.58,y+b*h,v],[u+c*h*.58,y+d*h,v],h*.055,bulbs?C.red:C.white,7,4);if(bulbs){const n=Math.ceil(Math.hypot((a-c)*.58,b-d)*h/.12);for(let k=0;k<=n;k++){const f=k/n;const bu=u+(a+(c-a)*f)*h*.58,by=y+(b+(d-b)*f)*h;for(let j=0;j<8;j++){const a=j*Math.PI/4,b=(j+1)*Math.PI/4;t.tri([bu,by,v+.06],[bu+Math.cos(a)*.035,by+Math.sin(a)*.035,v+.06],[bu+Math.cos(b)*.035,by+Math.sin(b)*.035,v+.06],[1,.90,.56]);}}}}}
function target(t,u,y,v,r){for(let ring=0;ring<5;ring++){const rr=r*(1-ring*.20),next=Math.max(0,rr-r*.20),col=ring%2?C.white:C.red;for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,at=(a,r)=>[u+Math.cos(a)*r,y+Math.sin(a)*r,v+ring*.002];t.q(at(a,rr),at(b,rr),at(b,next),at(a,next),col,7);}}}
function shootingGallery(g){const t=frame(g,gallery.x,gallery.z,Math.PI/2),w=gallery.w,d=gallery.d;
 t.box(0,.02,-d/2,w,2.7,.16,C.wood,12);for(const u of [-w/2,w/2])t.box(u,.02,0,.15,2.7,d,C.wood,12);
 t.box(0,.03,d/2,w,.90,.15,C.wood,12);t.box(0,.92,d/2,w+.1,.12,.65,[.30,.22,.14],12);t.box(0,2.45,d/2,w+.3,.76,.22,C.wood,12);t.box(0,3.21,0,w+.45,.16,d+.55,[.23,.21,.18],14);
 for(const u of [-2.87,2.87])t.box(u,.96,d/2,.13,1.50,.13,C.wood,12);
 t.box(0,.99,-1.77,5.70,1.40,.045,[.08,.11,.10]);for(let i=0;i<6;i++){const u=-2.25+i*.90;t.oval(u,1.4+(i%2)*.35,-1.71,.17,.17,.06,[.74,.70,.48],7);t.beam([u,.98,-1.71],[u,1.4+(i%2)*.35,-1.71],.02,C.dark);}
 letters(t,'ТИР',2.57,2.03,.49,true);
 // The large painted target is on the south return, readable from the junction.
 t.box(3.09,.13,0,.04,2.25,3.70,[.27,.40,.39],1);const side=frame(g,54.3,-259.62,0);target(side,0,1.28,0,.97);
 // Side-facing mural uses the same opaque vector rings as the facade targets.
 const front=frame(g,52.30,-262.8,Math.PI/2);target(front,0,.46,.014,.31);
}
function railing(t,a,b,height=.82){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.60);for(let i=0;i<=n;i++){const f=i/n,u=a[0]+(b[0]-a[0])*f,v=a[1]+(b[1]-a[1])*f;t.beam([u,.12,v],[u,height,v],.022,C.blue,2,5);}for(const y of [.25,height])t.beam([a[0],y,a[1]],[b[0],y,b[1]],.035,C.blue,2,6);}
function spherePod(t,u,v,col){t.box(u,.16,v,.92,.32,.92,col);t.oval(u,.55,v,.55,.30,.55,[.66,.72,.70],3);t.oval(u,1.14,v,.66,.68,.66,col,3);
 for(let k=0;k<3;k++)for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,phi=k*Math.PI/3,p=a=>[u+Math.cos(a)*.67*Math.cos(phi),1.14+Math.sin(a)*.69,v+Math.cos(a)*.67*Math.sin(phi)];t.beam(p(a),p(b),.018,C.white,2,4);}t.box(u,.79,v+.66,.32,.24,.05,[.15,.20,.22]);}
function playground(g){const t=frame(g,play.x,play.z,Math.PI/2),w=play.w,d=play.d;
 t.box(0,.03,0,w,.15,d,[.28,.34,.37],1);t.box(0,.18,-1.4,w,2.28,.14,[.23,.29,.46]);
 for(const u of [-4.4,0,4.4]){t.box(u,.18,-1.35,.12,2.34,.12,C.red);t.box(u,.18,2.8,.12,2.34,.12,C.blue);}
 for(let i=0;i<6;i++){const u=-3.75+i*1.5;t.box(u,2.52,.68,1.5,.15,4.9,i%2?C.yellow:C.red);t.box(u,2.17,-1.30,.65,.30,.07,i%2?C.blue:C.red);}
 // Open blue railings leave a gate facing the main avenue.
 railing(t,[-4.5,-3.1],[4.5,-3.1]);railing(t,[-4.5,-3.1],[-4.5,3.1]);railing(t,[4.5,-3.1],[4.5,3.1]);railing(t,[-4.5,3.1],[-.75,3.1]);railing(t,[.75,3.1],[4.5,3.1]);
 for(const u of [-2.8,2.8])spherePod(t,u,1.16,u<0?[.60,.43,.68]:[.26,.62,.64]);
 for(const side of [-1,1]){t.box(side*.80,.02,3.52,.08,.70,.96,C.blue,2);t.beam([side*.80,.70,3.05],[side*.80,.59,4.02],.033,C.blue,2);}
 t.box(0,.02,3.82,1.48,.08,.55,[.48,.49,.43],1);t.box(0,.10,3.39,1.48,.08,.40,[.48,.49,.43],1);
 const counter=frame(g,56.6,-224.5,Math.PI/2);counter.box(0,.05,0,1.7,.98,1.0,C.white,1);counter.box(0,1.03,0,1.8,.08,1.1,C.blue);counter.box(0,.39,.52,.90,.30,.035,C.dark);
 const pop=frame(g,58.6,-219.5,Math.PI/2);pop.box(0,.04,0,2.6,2.5,1.7,C.dark,12);pop.box(0,1.07,.87,2.15,1.03,.05,[.25,.30,.27],3);pop.box(0,1.02,.98,2.40,.10,.34,C.white);pop.box(0,2.12,.87,2.7,.48,.10,C.dark);pop.box(0,2.55,0,2.9,.15,2.0,C.red);letters(pop,'ПОПКОРН',2.25,.94,.22);
}
function rockWall(g,a,b){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),t=frame(g,a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0]));t.box(length/2,.02,0,length,1.87,.60,[.31,.33,.29],1);
 for(let row=0;row<5;row++)for(let u=-.30+(row%2)*.35;u<length;u+=.73){const l=Math.max(.02,u),r=Math.min(length-.02,u+.68);if(r<=l)continue;const y=.08+row*.37,top=y+.29+.07*Math.sin(u*9+row),shade=.82+.22*(.5+.5*Math.sin(u*17+row*9)),col=[.57,.57,.50].map(v=>v*shade);for(const side of [-1,1]){const v=side*.335;const points=[[l+.06,y+.04,v],[r-.04,y,v],[r,top-.07,v+side*.04],[(l+r)/2+.08,top+.04,v+side*.06],[l,top-.025,v+side*.03]];for(let k=1;k<points.length-1;k++)t.tri(points[0],points[k],points[k+1],col,1);}if(row===4)t.box((l+r)/2,1.88,0,r-l,.16+Math.sin(u*13)*.06,.69,col,1);}
}
function junction(g){const t=frame(g);for(let i=1;i<wall.length;i++)rockWall(g,wall[i-1],wall[i]);
 // A low weathered shed is seen above the stone wall; no invented entrance on the path.
 t.box(26,.02,-224,18,2.9,4.5,[.31,.34,.29],12);t.q([16.8,2.94,-226.5],[35.2,2.94,-226.5],[35.2,4.05,-224],[16.8,4.05,-224],[.31,.31,.27],14);t.q([16.8,4.05,-224],[35.2,4.05,-224],[35.2,2.94,-221.5],[16.8,2.94,-221.5],[.25,.28,.25],14);
 for(const x of [17,35]){t.tri([x,2.9,-226.25],[x,4.05,-224],[x,2.9,-221.75],[.30,.33,.29],12);}
 for(let i=0;i<hedges.length;i++){const [x,z]=hedges[i];t.oval(x,1.1,z,.88,1.10,.72,i%2?C.leaf:[.14,.30,.15]);t.oval(x-.11,1.61,z,.58,.53,.57,C.leaf);}
 // Low curbs follow the outside path edges, never crossing the intersection.
 for(const [path,half] of [[westPath,1.82],[eastPath,1.82]])for(let i=2;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);for(const sign of [-1,1]){const nx=-dz/len*half*sign,nz=dx/len*half*sign;t.beam([a[0]+nx,.10,a[1]+nz],[b[0]+nx,.10,b[1]+nz],.075,[.64,.64,.56],1,4);}}
}
function rect(x,z,cx,cz,w,d){return Math.abs(x-cx)<w/2&&Math.abs(z-cz)<d/2;}
function solid(x,z){
 if(rect(x,z,gallery.x,gallery.z,gallery.d+.12,gallery.w+.12)||rect(x,z,26,-224,18.2,4.7)||distance(wall,x,z)<.43)return true;
 if(planters.some(p=>rect(x,z,p[0],p[1],p[2]+.12,p[3]+.12))||pots.some(p=>Math.hypot(x-p[0],z-p[1])<.42)||umbrellas.some(p=>rect(x,z,p[0],p[1],1.95,2.4)))return true;
 if(hedges.some(p=>Math.hypot((x-p[0])/.96,(z-p[1])/.80)<1))return true;
 const u=z-play.z,v=play.x-x;
 if(Math.abs(u)<4.65&&Math.abs(v)<3.28&&(Math.abs(u)>4.32||v<-2.9||v>2.9&&Math.abs(u)>.88||v<-1.20&&v>-1.60))return true;
 if([-2.8,2.8].some(a=>Math.hypot(u-a,v-1.16)<.67)||rect(x,z,56.6,-224.5,1.2,1.9)||rect(x,z,58.6,-219.5,1.9,2.8))return true;
 return false;
}
function clearsTree(x,z){return x>-2&&x<96&&z>-279&&z<-210&&((inside(terraceArea,x,z)||rect(x,z,67,-261,34,29))||distance(westPath,x,z)<2.6||distance(eastPath,x,z)<2.6||distance(avenue,x,z)<4.9||rect(x,z,play.x,play.z,9,12)||rect(x,z,26,-231.5,29,20)||rect(x,z,58.6,-219.5,4,4));}
function applyGround(cats,park){const retired=[park.rides[45].pts,park.rides[46].pts],pavilion=park.buildings[68].pts;
 for(let iz=Math.max(0,Math.floor((-279-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-187-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((-2-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((96-park.x0)/park.mpp));ix++){
  const index=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,old=cats[index]&31;
  if(old===12&&retired.some(p=>inside(p,x,z)))cats[index]=65;
  if(inside(pavilion,x,z))cats[index]=69;
  if(inside(terraceArea,x,z)&&!inside(pavilion,x,z)&&old!==5)cats[index]=66;
  if(rect(x,z,play.x,play.z,6.5,9.3))cats[index]=66;
  if(distance(westPath,x,z)<1.7||distance(eastPath,x,z)<1.7)cats[index]=67;
  if(z>-258&&z<-211&&distance(avenue,x,z)<4.5&&![4,5,12,13].includes(cats[index]&31))cats[index]=67;
  if(solid(x,z))cats[index]=77;
 }
}
const api={avenue,westPath,eastPath,terraceArea,gallery,play,wall,trees,umbrellas,planters,pots,hedges,inside,distance,solid,clearsTree,applyGround,terrace,shootingGallery,playground,junction};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkAvenueJunction=api;
})(typeof window!=='undefined'?window:globalThis);
