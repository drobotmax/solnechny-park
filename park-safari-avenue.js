// Five panorama views of the food stalls and Safari entrance farther down the avenue.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const C={dark:[.12,.15,.14],wood:[.45,.27,.15],white:[.90,.88,.80],green:[.16,.31,.20],blue:[.12,.24,.43],stone:[.56,.54,.48],red:[.73,.18,.13],yellow:[.92,.65,.20]};
const avenue=[[54,-215],[59,-193.5],[64.5,-165],[67,-152]];
const approach=[[53.9,-197.5],[44,-194.5],[35.5,-192.2],[32,-193.5]];
const gate={x:35.5,z:-192.2,width:4.8,clearance:3.1};
const hotdog={x:65.7,z:-203.2,w:3.8,d:2.6},meal={x:67.4,z:-197.9,w:5.0,d:2.8};
const fresh={x:77.1,z:-192.3,w:3.8,d:2.7},coffee={x:77.2,z:-186.8,w:3.6,d:3.0};
const gurman={x:68.5,z:-182.7,w:5.6,d:3.6},picnic={x:71.0,z:-168.8,w:4.2,d:3.0};
const forecourt=[[63.6,-195],[81.8,-195],[82.6,-180],[71.5,-176.6],[65.4,-178.5],[64.8,-185.8]];
const rearWalk=[[79.7,-189.6],[83.0,-189.6],[84,-180],[80,-173],[77,-169]];
const courtFence=[[0,-161.52],[39.05,-168.54],[43.3,-145.2]];
const shade={x:65,z:-211.8,w:6.8,d:4.4};
const ticket={x:33.0,z:-199.6,w:4.9,d:3.7};
const wall=[[41,-234],[34.1,-216],[35.6,-203]];
const southWall=[[36,-188.6],[37.5,-182.5]];
const fenceAxis=[[32.94,-226.82],[36.46,-193.21],[39.05,-168.54]];
const bench=[52.2,-188.5],bin=[52.4,-186.7],trees=[[43.3,-204.9,18,5.8],[47.3,-180.5,19,6],[83.6,-199,19,6]];
const innerHedge=[[26.5,-195],[26.5,-192],[26.5,-189],[26.5,-186]];
const pots=[[71.2,-195.0],[81.8,-182.2],[67.4,-166.1]],covered=[[58.7,-164.5],[59.1,-162.8]];
function frame(g,x=0,z=0,a=0){const c=Math.cos(a),s=Math.sin(a),at=(u,y,v)=>[x+c*u-s*v,y,z+s*u+c*v];
 const q=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat);
 function box(u,y,v,w,h,d,col,mat=7){const p=[[u-w/2,y,v-d/2],[u+w/2,y,v-d/2],[u+w/2,y,v+d/2],[u-w/2,y,v+d/2]];for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];q(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}q([u-w/2,y+h,v-d/2],[u-w/2,y+h,v+d/2],[u+w/2,y+h,v+d/2],[u+w/2,y+h,v-d/2],col,mat);}
 function oval(u,y,v,rx,ry,rz,col,mat=7){const p=(i,j)=>{const a=i*Math.PI/4,b=-Math.PI/2+j*Math.PI/3;return [u+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,v+Math.sin(a)*Math.cos(b)*rz];};for(let j=0;j<3;j++)for(let i=0;i<8;i++)q(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
 return {at,q,box,oval,tri:(a,b,c,col,mat=7)=>g.tri(at(...a),at(...b),at(...c),col,mat),beam:(a,b,r,col=C.dark,mat=7,n=6)=>g.beam(at(...a),at(...b),r,col,mat,n)};
}
// Stroke lettering stays solid and follows the same lighting as the other landmarks.
const glyphs={
 'А':[[0,0,.5,1],[.5,1,1,0],[.2,.4,.8,.4]],'Б':[[0,0,0,1],[0,1,1,1],[0,.55,.8,.55],[.8,.55,1,.4],[1,.4,1,.15],[1,.15,.8,0],[.8,0,0,0]],
 'В':[[0,0,0,1],[0,1,.8,1],[.8,1,1,.8],[1,.8,.8,.55],[.8,.55,0,.55],[.8,.55,1,.35],[1,.35,1,.15],[1,.15,.8,0],[.8,0,0,0]],
 'Г':[[0,0,0,1],[0,1,1,1]],'Д':[[.1,.15,.35,1],[.35,1,.9,1],[.9,1,.9,.15],[0,.15,1,.15],[0,.15,0,0],[1,.15,1,0]],
 'Е':[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]],'И':[[0,0,0,1],[0,0,1,1],[1,1,1,0]],'К':[[0,0,0,1],[0,.5,1,1],[0,.5,1,0]],
 'Н':[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]],'О':[[.2,0,0,.2],[0,.2,0,.8],[0,.8,.2,1],[.2,1,.8,1],[.8,1,1,.8],[1,.8,1,.2],[1,.2,.8,0],[.8,0,.2,0]],
 'П':[[0,0,0,1],[0,1,1,1],[1,1,1,0]],'Р':[[0,0,0,1],[0,1,.8,1],[.8,1,1,.8],[1,.8,1,.65],[1,.65,.8,.5],[.8,.5,0,.5]],
 'С':[[1,.9,.8,1],[.8,1,.2,1],[.2,1,0,.8],[0,.8,0,.2],[0,.2,.2,0],[.2,0,.8,0],[.8,0,1,.1]],'Т':[[0,1,1,1],[.5,1,.5,0]],
 'Ф':[[.5,0,.5,1],[.5,.2,0,.3],[0,.3,0,.8],[0,.8,1,.8],[1,.8,1,.3],[1,.3,.5,.2]],'Х':[[0,0,1,1],[0,1,1,0]],
 'Ъ':[[0,1,.35,1],[.35,1,.35,0],[.35,.5,.85,.5],[.85,.5,1,.35],[1,.35,1,.15],[1,.15,.85,0],[.85,0,.35,0]],
 'Я':[[1,0,1,1],[1,1,.2,1],[.2,1,0,.8],[0,.8,0,.65],[0,.65,.2,.5],[.2,.5,1,.5],[.7,.5,0,0]],
 'У':[[0,1,.5,.5],[1,1,.5,.5],[.5,.5,.15,0]],'М':[[0,0,0,1],[0,1,.5,.4],[.5,.4,1,1],[1,1,1,0]],
 'Ш':[[0,1,0,0],[0,0,1,0],[.5,0,.5,1],[1,0,1,1]],'•':[[.45,.5,.55,.5]],
 '-':[[.1,.5,.9,.5]],'&':[[1,0,0,.8],[0,.8,.2,1],[.2,1,.6,1],[.6,1,.7,.8],[.7,.8,0,.2],[0,.2,.2,0],[.2,0,.6,0],[.6,0,1,.55]]
};
for(const [latin,cyrillic] of [['C','С'],['O','О'],['E','Е']])glyphs[latin]=glyphs[cyrillic];glyphs.F=[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5]];
function label(t,word,y,v,width,h=.4,col=C.white){if(!api.signsEnabled)return;h=Math.min(h,width/(word.length*.72));const step=h*.72,left=-(word.length-1)*step/2-h*.27;for(let i=0;i<word.length;i++)for(const [a,b,c,d] of glyphs[word[i]]||[])t.beam([left+i*step+a*h*.54,y+b*h,v],[left+i*step+c*h*.54,y+d*h,v],h*.043,col,7,4);}
function disc(t,u,y,v,r,col,n=12){for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;t.tri([u,y,v],[u+Math.cos(a)*r,y+Math.sin(a)*r,v],[u+Math.cos(b)*r,y+Math.sin(b)*r,v],col);}}
function hotdogPicture(t,u,y,v,scale=1){t.oval(u,y,v,.42*scale,.17*scale,.025,[.75,.44,.19]);t.oval(u,y+.015,v+.028,.35*scale,.085*scale,.02,[.65,.21,.12]);for(let i=0;i<5;i++){const x=u-.25*scale+i*.12*scale;t.beam([x,y-.025*scale,v+.055],[x+.065*scale,y+.06*scale,v+.055],.018*scale,C.yellow,7,4);}}
function menu(t,u,y,v,w,h,seed=0){t.box(u,y,v,w,h,.035,[.78,.75,.61]);t.box(u,y+h-.16,v+.025,w,.16,.022,[.52,.17,.12]);for(let j=0;j<3;j++){const yy=y+.18+j*(h-.32)/3;disc(t,u-w*.25,yy+.12,v+.03,.12,C.white);hotdogPicture(t,u-w*.25,yy+.12,v+.04,.25);for(let k=0;k<2;k++)t.box(u+w*.13,yy+.05+k*.09,v+.04,w*.35-(seed+j+k)%3*.025,.016,.015,[.23,.25,.21]);}}
function stallBody(g,s,wood=false){const t=frame(g,s.x,s.z,Math.PI/2),face=s.d/2;
 t.box(0,.03,0,s.w,2.85,s.d,wood?C.wood:[.10,.14,.12],wood?12:2);t.box(0,2.89,0,s.w+.25,.15,s.d+.30,[.14,.16,.15],14);
 t.box(0,1.04,face+.035,s.w-.35,1.10,.065,[.07,.11,.10]);t.box(0,.99,face+.20,s.w-.25,.11,.49,[.31,.28,.21],12);
 t.box(0,2.18,face+.07,s.w+.12,.77,.14,wood?[.19,.17,.14]:[.09,.12,.10],12);
 for(const u of [-s.w/2+.09,s.w/2-.09])t.box(u,.05,face+.08,.10,2.15,.13,wood?[.61,.35,.17]:[.24,.28,.23],12);
 return {t,face:face+.155};
}
function flowerPot(g,x,z){const t=frame(g,x,z);t.box(0,.03,0,.58,.58,.58,C.wood,12);t.oval(0,.91,0,.43,.40,.43,[.23,.40,.19],16);for(let i=0;i<5;i++)t.oval(Math.cos(i*2.4)*.25,1.15,Math.sin(i*2.4)*.25,.10,.07,.10,i%2?C.white:[.75,.42,.48]);}
function burgerPicture(t,u,y,v,s=1){t.oval(u,y+.12*s,v,.39*s,.17*s,.025,[.79,.49,.22]);t.box(u,y-.03*s,v+.03,.75*s,.055*s,.03,[.27,.40,.16]);t.box(u,y-.11*s,v+.035,.70*s,.08*s,.035,[.34,.16,.08]);t.oval(u,y-.20*s,v,.37*s,.08*s,.025,[.77,.42,.16]);}
function courtStalls(g){
 const f=stallBody(g,fresh);label(f.t,'ФРЕШ • ХОТ-ДОГ',2.38,f.face+.015,3.58,.31);menu(f.t,-1.06,1.13,f.face-.04,1.15,.91);hotdogPicture(f.t,.66,.54,f.face-.025,1.15);
 for(let i=0;i<4;i++){f.t.box(-.38+i*.22,1.15,f.face-.02,.10,.39,.10,[.58,.63,.47]);f.t.box(-.38+i*.22,1.54,f.face-.02,.075,.07,.075,C.white);}
 const c=stallBody(g,coffee);disc(c.t,0,.51,c.face,.29,[.77,.78,.69]);label(c.t,'COFFEE',2.39,c.face+.025,2.82,.35);c.t.box(-.25,3.05,-.2,1.15,.57,.85,[.67,.69,.64],2);
 for(let i=0;i<5;i++)c.t.box(-.65+i*.18,3.17,.235,.04,.24,.025,[.38,.43,.39],2);c.t.box(1.1,3.05,.15,.60,.25,.60,C.red);
 const k=stallBody(g,gurman,true);label(k.t,'ГУРМАН',2.38,k.face+.02,3.30,.46);burgerPicture(k.t,2.08,2.55,k.face+.03,.63);menu(k.t,-1.93,1.13,k.face-.04,1.20,.95,1);
 k.t.box(1.75,.18,k.face-.05,1.05,1.91,.10,[.28,.39,.37],3);for(let i=0;i<3;i++){k.t.box(1.75,.39+i*.48,k.face+.02,.91,.035,.06,[.69,.72,.64]);for(let j=0;j<4;j++)k.t.box(1.43+j*.21,.43+i*.48,k.face+.04,.10,.28,.06,j%2?[.56,.22,.13]:[.27,.46,.37]);}
 k.t.box(.5,3.05,-.15,1.28,.53,.92,[.66,.68,.61],2);for(let i=0;i<5;i++)k.t.box(.06+i*.21,3.17,.32,.05,.23,.03,[.40,.44,.39],2);
 // Horizontal wood boards and upright corner strips match the photograph's warm cabin.
 for(let j=0;j<7;j++)k.t.box(0,.15+j*.12,k.face-.01,5.27,.025,.025,[.30,.20,.12],12);
}
function foodStalls(g){
 const h=stallBody(g,hotdog);label(h.t,'ХОТ-ДОГИ&',2.35,h.face+.015,3.25,.44);menu(h.t,-.38,1.14,h.face-.04,2.6,.88);label(h.t,'COFFEE',.35,h.face-.02,1.05,.23);hotdogPicture(h.t,-1.05,.43,h.face-.02,.73);
 h.t.oval(1.05,.44,h.face-.02,.11,.36,.025,[.79,.50,.25]);for(let i=0;i<4;i++)h.t.beam([.98,.20+i*.13,h.face+.01],[1.12,.28+i*.13,h.face+.01],.016,C.white,7,4);
 const m=stallBody(g,meal,true);label(m.t,'ОСТРОВ ОБЪЕДЕНИЯ',2.36,m.face+.015,4.65,.43);menu(m.t,-1.12,1.13,m.face-.04,1.92,.94);menu(m.t,.45,1.13,m.face-.04,.99,.94,1);
 for(const u of [-2.36,2.36])for(let i=0;i<7;i++)disc(m.t,u,.43+i*.27,m.face+.01,.043,[1,.84,.46],6);
 // The south-facing side menu is visible from the open forecourt.
 const side=frame(g,meal.x,meal.z+meal.w/2+.045);side.box(0,.34,0,2.65,2.29,.05,[.87,.79,.57]);
 burgerPicture(side,-.68,2.12,.04,.76);hotdogPicture(side,.58,1.30,.04,.95);side.box(.60,1.83,.04,.31,.52,.025,[.73,.35,.29]);side.beam([.62,2.29,.07],[.70,2.62,.07],.018,C.white,7,4);
 for(let j=0;j<4;j++)side.box(-.60,.67+j*.14,.04,.85,.026,.02,[.36,.34,.24]);side.box(0,.04,.23,2.70,.28,.47,C.wood,12);
 m.t.box(0,3.05,-.35,2.1,.36,1.1,[.55,.58,.54],2);m.t.beam([0,3.35,-.35],[1.15,3.35,-.35],.23,[.61,.63,.57],2,10);
 api.courtStalls(g);
 const p=stallBody(g,picnic,true);label(p.t,'ПИКНИК',2.36,p.face+.015,3.5,.42);menu(p.t,-.60,1.13,p.face-.04,1.65,.94,2);p.t.box(0,2.12,p.face+.22,4.65,.13,.75,[.41,.19,.14],14);
 const s=frame(g,shade.x,shade.z,Math.PI/2);s.box(0,2.40,0,shade.w+.3,.10,shade.d+.4,[.28,.36,.21],17);
 for(const u of [-shade.w/2,shade.w/2])for(const v of [-shade.d/2,shade.d/2])s.beam([u,.04,v],[u,2.47,v],.035,[.47,.52,.43],2,6);
 s.box(0,.05,-1.9,shade.w,2.20,.08,C.blue,17);for(const u of [-2.25,2.25])s.box(u,.05,1.7,2.15,2.15,.055,[.10,.18,.32],17);for(let i=0;i<12;i++)s.box(-3+i*.53,.06,1.74,.025,2.10,.025,[.15,.22,.35],17);
 for(const p of pots)flowerPot(g,...p);
}
function boulder(t,u,y,v,rx,ry,rz,seed){const n=7,point=(i,j)=>{const a=i*Math.PI*2/n,level=[-.78,0,.78][j],r=j===1?1:.57,noise=1+.10*Math.sin(i*13+seed*7+j);return [u+Math.cos(a)*rx*r*noise,y+level*ry,v+Math.sin(a)*rz*r*noise];};for(let j=0;j<2;j++)for(let i=0;i<n;i++){const shade=.83+.16*(.5+.5*Math.sin(seed*7+i*2+j)),col=C.stone.map(v=>v*shade);t.q(point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),col,1);}for(let i=1;i<n-1;i++){t.tri(point(0,2),point(i,2),point(i+1,2),[.64,.61,.53],1);t.tri(point(0,0),point(i+1,0),point(i,0),C.stone,1);}}
function rockSection(g,a,b){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));t.box(len/2,.03,0,len,2.05,.68,[.25,.29,.24],1);
 for(let row=0;row<4;row++)for(let i=0,u=.35-(row%2)*.40;u<len;u+=.89,i++){const left=Math.max(.01,u-.40),right=Math.min(len-.01,u+.42);if(right<=left)continue;const y=.07+row*.49,top=y+.42+.055*Math.sin(i*7+row*3),color=[.56,.53,.46].map(v=>v*(.84+.20*(.5+.5*Math.sin(i*17+row))));
  for(const sign of [-1,1]){const v=sign*.37,p=[[left,y+.09,v],[right-.08,y,v],[right,top-.09,v+sign*.07],[(left+right)/2+.10,top,v+sign*.10],[left+.04,top-.06,v+sign*.03]];for(let k=1;k<p.length-1;k++)t.tri(p[0],p[k],p[k+1],color,1);}
 }
}
function safariGate(g){const t=frame(g,gate.x,gate.z,-Math.PI/2);
 for(let i=1;i<wall.length;i++)rockSection(g,wall[i-1],wall[i]);rockSection(g,...southWall);
 // Faceted boulders reproduce the irregular shaded portal without guessing an animal species.
 for(const side of [-1,1]){t.box(side*3.10,.02,0,1.35,3.15,1.8,[.28,.30,.25],1);for(let j=0;j<5;j++)for(let k=0;k<2;k++)boulder(t,side*(2.86+k*.48),.34+j*.57,.52-k*.70,.52,.40,.69,j*4+k+side*12);}
 for(let i=0;i<9;i++){const u=-3.3+i*.82;boulder(t,u,3.53+.20*Math.cos(u*.80),.16,.68,.50,.98,30+i);}
 for(let i=0;i<6;i++)boulder(t,-2.7+i*1.05,4.00+.20*Math.sin(i*2.1),-.36,.65,.34,.80,60+i);
 const o=frame(g,ticket.x,ticket.z,-Math.PI/2);o.box(0,.03,0,ticket.w,2.77,ticket.d,[.39,.40,.33],1);o.box(0,2.82,0,ticket.w+.35,.14,ticket.d+.45,[.40,.46,.46],14);
 o.box(0,1.00,1.88,2.35,1.05,.06,[.09,.14,.12]);o.box(0,.93,2.02,2.58,.10,.45,[.68,.67,.54]);for(const u of [-1.24,1.24])o.box(u,.95,1.93,.07,1.21,.12,C.wood,12);o.box(0,2.12,1.93,2.55,.07,.12,C.wood,12);label(o,'КАССА',2.35,1.94,2.5,.25);
 rockSection(g,[35.6,-197.1],[35.6,-195.5]);
 // A low pitched roof continues the enclosure silhouette behind its street wall.
 const foliage=frame(g);for(let i=0;i<innerHedge.length;i++){const [x,z]=innerHedge[i];foliage.box(x,.02,z,2.0,2.30,3.0,i%2?[.10,.23,.13]:[.13,.28,.14],16);foliage.oval(x,2.33,z,1.10,.91,1.65,[.12,.26,.14],16);}
 const r=frame(g,30.5,-211.5);r.box(0,.03,0,5.2,2.50,17,[.32,.35,.30],12);r.q([-2.9,2.55,-8.8],[0,3.30,-8.8],[0,3.30,8.8],[-2.9,2.55,8.8],[.33,.38,.38],14);r.q([0,3.30,-8.8],[2.9,2.55,-8.8],[2.9,2.55,8.8],[0,3.30,8.8],[.26,.31,.30],14);
}
function avenueDetails(g){const t=frame(g),b=frame(g,...bench,Math.PI/2);for(let i=0;i<4;i++){b.box(0,.45,-.18+i*.12,2.05,.07,.10,C.wood,12);b.box(0,.65+i*.12,.25,2.05,.08,.06,C.wood,12);}for(const u of [-.78,.78]){b.beam([u,.03,-.15],[u,.47,-.15],.045);b.beam([u,.03,.22],[u,1.08,.28],.045);b.beam([u,.75,-.15],[u,.75,.25],.036);}
 api.sportsFence(g);
 const r=frame(g,...bin);r.box(0,.06,0,.44,.76,.44,[.23,.25,.20],2);r.box(0,.83,0,.49,.06,.49,C.dark,2);for(const x of [-.25,.25])r.box(x,.02,0,.035,.86,.04,C.dark,2);
 // Flush dark stone bands border the pale entry paving; none block the doorway.
 for(let i=1;i<approach.length-1;i++){const a=approach[i-1],b=approach[i],angle=Math.atan2(b[1]-a[1],b[0]-a[0]),len=Math.hypot(b[0]-a[0],b[1]-a[1]),f=frame(g,...a,angle);for(const side of [-1,1])f.box(len/2,.018,side*2.66,len,.022,.28,[.47,.48,.46],1);if(i===1)f.box(0,.018,0,.28,.022,5.60,[.47,.48,.46],1);}
 t.beam([61.8,.02,-207.0],[61.8,6.9,-207.0],.065,[.47,.50,.46],2,8);t.beam([61.8,6.87,-207.0],[61.0,7.11,-207.0],.04,[.47,.50,.46],2);t.box(60.9,7.05,-207.0,.50,.10,.20,[.75,.75,.65],2);
 // Only the low covered shapes are distinguishable at the far verge in the reference.
 for(const p of covered){t.box(p[0],.03,p[1],1.25,.56,1.05,[.17,.35,.30],2);t.oval(p[0],.59,p[1],.64,.38,.53,[.23,.43,.37],2);}
}
function sportsFence(g){const col=[.16,.36,.46],t=frame(g);for(let i=1;i<courtFence.length;i++){const a=courtFence[i-1],b=courtFence[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),f=frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0])),n=Math.ceil(len/3.0);
 for(let j=0;j<=n;j++){const u=len*j/n;f.beam([u,.02,0],[u,2.42,0],.043,col,2,6);}
 for(const y of [.10,1.22,2.37])f.beam([0,y,0],[len,y,0],.018,col,2,4);
 for(let j=0;j<Math.ceil(len/.82);j++){const u=j*.82,w=Math.min(.82,len-u);for(let k=0;k<4;k++){const y=.12+k*.55;f.beam([u,y,0],[u+w,y+.52,0],.006,[.32,.49,.51],2,3);f.beam([u,y+.52,0],[u+w,y,0],.006,[.32,.49,.51],2,3);}}
}}
function rect(x,z,p,w,d){return Math.abs(x-p[0])<w/2&&Math.abs(z-p[1])<d/2;}
function replacesFence(x,z){return z>-234&&z<-182&&J.distance(fenceAxis,x,z)<.80||J.distance(courtFence,x,z)<.45;}
function solid(x,z){
 if([hotdog,meal,fresh,coffee,gurman,picnic].some(s=>rect(x,z,[s.x,s.z],s.d+.15,s.w+.15))||rect(x,z,[ticket.x,ticket.z],ticket.d+.15,ticket.w+.15)||J.distance(courtFence,x,z)<.16)return true;
 if(innerHedge.some(p=>rect(x,z,p,2.20,3.2)))return true;
 if(J.distance(wall,x,z)<.44||J.distance(southWall,x,z)<.44||rect(x,z,[30.5,-211.5],5.3,17.2))return true;
 if(Math.abs(x-gate.x)<1.18&&Math.abs(z-gate.z)>2.45&&Math.abs(z-gate.z)<3.9||rect(x,z,[35.6,-196.3],.8,1.6))return true;
 if(rect(x,z,bench,.80,2.20)||rect(x,z,bin,.64,.64)||pots.some(p=>rect(x,z,p,.72,.72))||covered.some(p=>rect(x,z,p,1.35,1.15))||Math.hypot(x-61.8,z+207.0)<.23)return true;
 const u=z-shade.z,v=shade.x-x;if(Math.abs(u)<shade.w/2+.1&&Math.abs(v)<shade.d/2+.1&&(v<-1.75||v>1.55&&Math.abs(u)>.95||Math.abs(u)>shade.w/2-.15))return true;
 return false;
}
function clearsTree(x,z){return x>26&&x<87&&z>-236&&z<-145&&(J.distance(avenue,x,z)<6.3||J.distance(approach,x,z)<4.2||J.distance(wall,x,z)<2.0||J.distance(courtFence,x,z)<.8||J.distance(rearWalk,x,z)<2.1||J.inside(forecourt,x,z)||rect(x,z,[36,-202],14,28)||rect(x,z,[67,-198],15,48));}
function applyGround(cats,park){const oldBuilding=park.buildings[115].pts,oldTicket=park.buildings[128].pts,oldPlay=park.rides[45].pts,oldPlayRing=oldPlay.concat([oldPlay[0]]);
 for(let iz=Math.max(0,Math.floor((-236-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-145-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((-1-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((87-park.x0)/park.mpp));ix++){
  const index=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,old=cats[index]&31;
  if(old===4)continue;
  // The raster outline extends outside its retired polygon by one or two cells.
  // Clear those remaining ride cells across the full width of the new forecourt.
  if(old===12&&x>61&&x<85&&z>-199&&z<-176&&J.distance(oldPlayRing,x,z)<.85)cats[index]=65;
  if(old===5&&(J.inside(oldBuilding,x,z)||J.inside(oldTicket,x,z)))cats[index]=66;
  if(old===13&&z<-182&&replacesFence(x,z)&&!J.solid(x,z))cats[index]=65;
  if(z>-217&&z<-152&&J.distance(avenue,x,z)<4.5&&![5,12,13].includes(cats[index]&31))cats[index]=67;
  if(J.distance(approach,x,z)<2.62&&x<54.2&&!J.solid(x,z))cats[index]=66;
  if(rect(x,z,[65.4,-197],7.6,30.0)&&x>61.8&&!J.solid(x,z)&&![5,12,13].includes(cats[index]&31))cats[index]=66;
  if((J.inside(forecourt,x,z)||J.distance(rearWalk,x,z)<1.05)&&![5,12,13].includes(cats[index]&31))cats[index]=66;
  // The photos show grass beside the asphalt, not a parallel walk or a spur to the courts.
  const roadX=z<-193.5?59+(z+193.5)*5/21.5:z<-165?59+(z+193.5)*5.5/28.5:64.5+(z+165)*2.5/13;
  const courtX=z<-168.54?42:Math.max(42,39.05+(z+168.54)*4.25/23.34+.50);
  if(z>-217&&z<-145&&x>courtX&&x<roadX-4.5&&J.distance(approach,x,z)>2.9&&[1,2,8,11].includes(cats[index]&31))cats[index]=65;
  // A small asphalt recess supports the existing bench without creating a tiled sidewalk.
  if(rect(x,z,[54.5,-188.5],6.6,3.2)&&![4,5,12,13].includes(cats[index]&31))cats[index]=67;
  if(solid(x,z))cats[index]=77;
 }
}
const api={signsEnabled:true,avenue,approach,gate,hotdog,meal,fresh,coffee,gurman,picnic,forecourt,rearWalk,courtFence,shade,ticket,wall,southWall,bench,bin,trees,pots,covered,innerHedge,foodStalls,courtStalls,safariGate,avenueDetails,sportsFence,label,solid,clearsTree,replacesFence,applyGround};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkSafariAvenue=api;
})(typeof window!=='undefined'?window:globalThis);
