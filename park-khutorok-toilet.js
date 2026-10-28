// The small toilet and cafe rear yard, with the user's corrected side entrance.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const K=typeof module!=='undefined'&&module.exports?require('./park-khutorok.js'):root.ParkKhutorok;
const C={wall:[.65,.75,.59],mortar:[.56,.65,.51],blue:[.10,.40,.47],sign:[.08,.19,.44],white:[.87,.89,.81],green:[.16,.43,.24],wood:[.39,.24,.16],dark:[.12,.17,.15],roof:[.38,.40,.35]};
const hut={at:[154.25,-212.95],width:3.7,depth:3.2,height:2.50,yaw:Math.PI};
const station=[151.0,-213.0],views={west:-1.62,north:.02,east:1.23,south:2.97,southwest:-1.86};
function hutPoint(u,v){const c=Math.cos(hut.yaw),s=Math.sin(hut.yaw);return [hut.at[0]+c*u-s*v,hut.at[1]+s*u+c*v];}
function hutLocal(x,z){const c=Math.cos(hut.yaw),s=Math.sin(hut.yaw),dx=x-hut.at[0],dz=z-hut.at[1];return [c*dx+s*dz,-s*dx+c*dz];}
function inHut(x,z,pad=0){const [u,v]=hutLocal(x,z);return Math.abs(u)<hut.width/2+pad&&Math.abs(v)<hut.depth/2+pad;}
const footprint=[[-hut.width/2,-hut.depth/2],[hut.width/2,-hut.depth/2],[hut.width/2,hut.depth/2],[-hut.width/2,hut.depth/2]].map(p=>hutPoint(...p));
const door={u:-1.16,width:.86,height:1.94,angle:1.31};
const apron=[[150.2,-214.9],[152.68,-214.9],[152.68,-210.45],[150.25,-210.45]];
const southLink=[station,[150.85,-211.25],[150.65,-209.85]],southWalk=[[147.45,-209.85],[152.35,-209.85],[159.35,-210.75]];
const entranceApron=[[-1.72,1.58],[-.52,1.58],[-.52,3.35],[-1.72,3.35]].map(p=>hutPoint(...p));
const entranceStation=[156.8,-216.2],entranceHeading=-2.44;
const entranceApproach=[station,[150.5,-215.1],[151.3,-215.7],[153.2,-216.0],[155.1,-216.1]];
const flowerbed=[[136.6,-210.0],[144.3,-209.7],[149.0,-211.0],[149.5,-208.7],[144,-206.8],[138,-207.5]];
const rearFence=[[147.5,-218.1],[149.4,-216.7],[152.5,-217.5],[156.9,-218.5],[156.9,-225.8]];
const screen=[[147.8,-218.6],[151.5,-219.0]],whiteBay=[[152.1,-224.5],[155.6,-224.5],[155.6,-220.8],[152.1,-220.4]];
const lawn=[[149,-225.2],[163.5,-225.2],[166.5,-201.5],[145.5,-201.5],[145.5,-215.0]];
const bin=[149.75,-211.25];
const trees=[[152.0,-217.8,16,4.7],[158.6,-208.35,15.5,4.5],[154.7,-218.0,17,4.7],[161.7,-220.3,17,5],[162.3,-203.7,15.5,5],[146.8,-204.0,18.5,5]];
const glyphs={'Т':[[0,1,1,1],[.5,1,.5,0]],'У':[[0,1,.5,.5],[1,1,.5,.5],[.5,.5,.25,0]],'А':[[0,0,.5,1],[.5,1,1,0],[.2,.4,.8,.4]],'Л':[[0,0,.28,1],[.28,1,1,1],[1,1,1,0]],'Е':[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]]};
function glyph(t,word,u,y,v,h){const step=h*.76,left=u-(word.length-1)*step/2-h*.28;for(let i=0;i<word.length;i++)for(const [a,b,c,d] of glyphs[word[i]])t.beam([left+i*step+a*h*.56,y+b*h,v],[left+i*step+c*h*.56,y+d*h,v],h*.034,C.white,7,4);}
function pictogram(t,u,y,v,woman){
 for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;t.tri([u,y+.28,v],[u+Math.cos(a)*.037,y+.28+Math.sin(a)*.037,v],[u+Math.cos(b)*.037,y+.28+Math.sin(b)*.037,v],C.white,7);}
 t.box(u,y+.095,v,.085,.13,.008,C.white,7);if(woman)t.tri([u,y+.22,v+.008],[u-.075,y+.08,v+.008],[u+.075,y+.08,v+.008],C.white,7);
 for(const s of [-1,1]){t.beam([u+s*.022,y+.10,v+.01],[u+s*.025,y,v+.01],.014,C.white,7,4);t.beam([u+s*.043,y+.21,v+.01],[u+s*.070,y+.12,v+.01],.012,C.white,7,4);}
}
function build(g){const t=K.frame(g,...hut.at,hut.yaw),w=hut.width,d=hut.depth,h=hut.height,v=d/2,lo=door.u-door.width/2,hi=door.u+door.width/2;
 // Separate wall pieces leave a real doorway rather than paint a door on a box.
 t.box(0,.04,0,w+.12,.14,d+.12,[.55,.59,.49],1);
 t.box(0,.18,-v,w,h-.18,.10,C.wall,1);
 for(const u of [-w/2,w/2])t.box(u,.18,0,.10,h-.18,d,C.wall,1);
 for(const [a,b] of [[-w/2,lo],[hi,w/2]])t.box((a+b)/2,.18,v,b-a,h-.18,.10,C.wall,1);
 t.box(door.u,door.height+.18,v,door.width,h-door.height-.18,.10,C.wall,1);
 // Fine courses are geometry, so the near wall keeps its pale painted-brick look.
 for(let row=0;row<13;row++){const y=.25+row*.17;
  for(const [a,b] of y<2.16?[[-w/2,lo],[hi,w/2]]:[[-w/2,w/2]]){
   t.quad([a,y,v+.057],[b,y,v+.057],[b,y+.009,v+.057],[a,y+.009,v+.057],C.mortar,1);
   for(let u=a+.20+(row%2)*.19;u<b-.05;u+=.40)t.quad([u,y,v+.058],[u+.008,y,v+.058],[u+.008,y+.17,v+.058],[u,y+.17,v+.058],C.mortar,1);
  }
  for(const u of [-w/2-.055,w/2+.055])t.quad([u,y,-v],[u,y,v],[u,y+.009,v],[u,y+.009,-v],C.mortar,1);
 }
 t.box(door.u,.18,v-.13,door.width,door.height,.035,[.12,.20,.17],1);
 for(const u of [lo-.03,hi+.03])t.box(u,.17,v+.075,.06,door.height+.10,.07,C.blue,2);
 t.box(door.u,door.height+.20,v+.075,door.width+.12,.07,.07,C.blue,2);
 for(const [depth,y] of [[.72,.04],[.36,.11]])t.box(door.u,y,v+depth/2,door.width+.15,.07,depth,[.47,.51,.45],1);
 const hinge=t.at(lo,.19,v+.08),leaf=K.frame(g,hinge[0],hinge[2],hut.yaw+door.angle);
 leaf.box(door.width/2,.19,0,door.width,door.height,.055,C.green,2);
 for(const u of [0,door.width])leaf.box(u,.18,0,.035,door.height+.03,.085,C.blue,2);
 leaf.box(.69,1.02,.04,.055,.06,.035,[.65,.66,.54],2);
 // The notices are deliberately unreadable blocks; only the identified WC sign is lettered.
 for(const [u,y,ww,hh] of [[.43,1.50,.35,.22],[.25,1.29,.32,.13],[.60,1.29,.32,.13]])leaf.box(u,y,.044,ww,hh,.012,[.78,.81,.70],7);
 const signU=.55,signY=1.05,signV=v+.095;
 t.box(signU,signY-.025,signV,1.97,.49,.027,C.white,7);t.box(signU,signY,signV+.02,1.91,.44,.014,C.sign,7);
 glyph(t,'ТУАЛЕТ',signU,signY+.085,signV+.046,.25);pictogram(t,signU-.83,signY+.055,signV+.049,false);pictogram(t,signU+.83,signY+.055,signV+.049,true);
 t.box(-.45,1.67,v+.075,.31,.46,.025,[.20,.25,.21],7);t.box(-.45,1.70,v+.092,.26,.40,.014,[.81,.83,.74],7);
 t.box(-.45,2.01,v+.107,.21,.035,.005,[.61,.23,.19],7);
 // The corner trim and exposed drainpipe rotate with the building.
 t.box(w/2-.15,.16,v+.066,.30,h-.10,.035,C.blue,2);
 t.box(w/2+.055,.16,v-.22,.035,h-.10,.50,C.blue,2);
 for(let i=0;i<7;i++){const u=w/2-.25+.12*(i%2),y=.48+i*.23;t.quad([u,y,v+.091],[u+.07,y+.015,v+.091],[u+.052,y+.092,v+.091],[u-.018,y+.065,v+.091],[.69,.61,.43],1);}
 t.beam([w/2-.06,.12,v+.16],[w/2-.06,2.62,v+.16],.023,[.10,.25,.29],2,6);
 t.beam([w/2-.06,2.50,v+.16],[w/2-.06,2.75,v+.43],.026,C.blue,2,4);
 t.box(w/2+.065,.92,-.10,.025,.58,.72,[.69,.70,.62],7);t.box(w/2+.082,1.04,-.10,.016,.29,.62,[.49,.28,.22],7);
 const a=[-w/2-.18,h+.05,-v-.20],b=[w/2+.18,h+.05,-v-.20],c=[w/2+.18,h+.05,v+.20],e=[-w/2-.18,h+.05,v+.20],r0=[0,3.36,-v-.20],r1=[0,3.36,v+.20];
 t.quad(a,e,r1,r0,C.roof,14);t.quad(b,r0,r1,c,[.32,.36,.32],14);t.tri([-w/2,h,v+.055],[w/2,h,v+.055],[0,3.30,v+.055],C.blue,12);
 t.tri([w/2,h,-v-.055],[-w/2,h,-v-.055],[0,3.30,-v-.055],C.blue,12);
 for(let u=-w/2;u<=w/2;u+=.22){const top=3.30-Math.abs(u)/(w/2)*.80;t.beam([u,h+.01,v+.070],[u,top,v+.070],.009,[.13,.34,.38],12,4);}
}
function pickets(g,path,height=.97){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));
 for(const u of [0,len])t.box(u,.04,0,.12,height+.10,.12,C.wood,12);
 for(const y of [.20,height-.10])t.box(len/2,y,0,len,.075,.07,C.wood,12);
 for(let u=.13;u<len-.05;u+=.18){t.quad([u-.05,.07,.045],[u+.05,.07,.045],[u+.05,height,.045],[u-.05,height,.045],C.wood,12);t.quad([u+.05,.07,-.045],[u-.05,.07,-.045],[u-.05,height,-.045],[u+.05,height,-.045],[.44,.28,.19],12);}
}}
function yardMesh(g){const t=K.frame(g);pickets(g,rearFence);pickets(g,screen,1.94);
 const a=screen[0],b=screen[1];g.quad([a[0]-.15,2.05,a[1]+.18],[b[0]+.15,2.05,b[1]+.18],[b[0]+.15,2.30,b[1]-1.6],[a[0]-.15,2.30,a[1]-1.6],C.roof,14);
 // A small light service bay belongs to the cafe, behind the low brown fence.
 for(let i=0;i<whiteBay.length;i++){const a=whiteBay[i],b=whiteBay[(i+1)%whiteBay.length];g.quad([a[0],.04,a[1]],[b[0],.04,b[1]],[b[0],2.02,b[1]],[a[0],2.02,a[1]],[.79,.80,.73],1);}
 t.box(153.9,.27,-220.55,1.18,1.43,.08,C.dark,1);for(const x of [153.27,154.53])t.box(x,.24,-220.49,.07,1.53,.07,C.white,1);
 const p=whiteBay.map(([x,z])=>[x,2.07,z]),r=[153.9,3.08,-222.5];for(let i=0;i<4;i++)g.tri(p[i],p[(i+1)%4],r,[.59,.60,.54],14);
 t.box(bin[0],.04,bin[1],.34,.57,.34,[.24,.27,.22],2);t.box(bin[0],.61,bin[1],.38,.13,.38,[.68,.71,.62],1);
 // Irises and sparse white flowers occupy the south side of the approach.
 for(let i=0;i<42;i++){const x=137.6+(i%9)*.81,z=-209.25+Math.floor(i/9)*.56+.10*Math.sin(i*2.1);if(!J.inside(flowerbed,x,z))continue;
  const h=.35+.19*(.5+.5*Math.sin(i*2.7));for(let j=0;j<3;j++){const a=i+j*2.1,dx=Math.cos(a)*.15,dz=Math.sin(a)*.15;g.tri([x-.025,.04,z],[x+dx,h,z+dz],[x+.025,.04,z],[.26,.45,.23],16);}
  if(i%3===0){t.beam([x,.10,z],[x,h+.09,z],.006,[.29,.42,.23],16,4);t.quad([x-.04,h+.09,z-.035],[x+.04,h+.09,z-.035],[x+.04,h+.09,z+.035],[x-.04,h+.09,z+.035],[.83,.85,.72],7);}
 }
}
function distanceToDoor(x,z){const [u,v]=hutLocal(x,z),lo=door.u-door.width/2;return J.distance([[lo,hut.depth/2+.08],[lo+Math.cos(door.angle)*door.width,hut.depth/2+.08+Math.sin(door.angle)*door.width]],u,v);}
function solid(x,z,pad=0){return J.inside(whiteBay,x,z)||J.distance(rearFence,x,z)<.085+pad||J.distance(screen,x,z)<.08+pad||distanceToDoor(x,z)<.065+pad||Math.hypot(x-bin[0],z-bin[1])<.21+pad;}
function clearsTree(x,z){return x>136&&x<167&&z>-227&&z<-200&&(J.inside(lawn,x,z)||J.inside(whiteBay,x,z)||J.inside(apron,x,z)||J.inside(entranceApron,x,z)||J.inside(flowerbed,x,z)||J.distance(southLink,x,z)<1.05||J.distance(southWalk,x,z)<1.05||J.distance(entranceApproach,x,z)<1.05||J.distance(rearFence,x,z)<.55||J.distance(screen,x,z)<.6);}
function ground(x,z){if(J.inside(apron,x,z)||J.inside(entranceApron,x,z)||J.distance(entranceApproach,x,z)<.58||J.distance(southLink,x,z)<.58||J.distance(southWalk,x,z)<.53)return 67;if(J.inside(lawn,x,z)||J.inside(flowerbed,x,z))return 65;return 0;}
const api={hut,station,views,footprint,hutPoint,hutLocal,inHut,door,apron,entranceApron,entranceStation,entranceHeading,entranceApproach,southLink,southWalk,flowerbed,rearFence,screen,whiteBay,lawn,bin,trees,build,yardMesh,solid,clearsTree,ground};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkKhutorokToilet=api;
})(typeof window!=='undefined'?window:globalThis);
