// The next avenue station: terrace details, flower borders and open garden gaps.
(function(root){
'use strict';
const C={white:[.89,.88,.81],wood:[.43,.28,.16],green:[.16,.34,.16],dark:[.13,.17,.16],pink:[.79,.48,.53],yellow:[.94,.65,.14]};
const bed=[[29.7,-295.7],[35.5,-274.5],[30.2,-272.9],[25.3,-292.3]];
const avenue=[[27.6,-327.78],[36.04,-295],[41,-274],[44.3,-256]];
const trees=[[22.3,-316.0,17,6.0],[28.5,-285.0,18,6.2],[33.5,-269.0,17,5.6]];
const benches=[[28.3,-301.6],[35.3,-271.4]],notice=[35.4,-267],bin=[37.1,-270.4];
const cafe={a:[44,-284],angle:Math.atan2(-32,-7),length:Math.hypot(32,7),start:-14.2,entrance:{u:-3,width:4.8,doorWidth:3.4},planters:[-12,-7.4,...Array.from({length:7},(_,i)=>1.4+i*4.6)]};
function local(x,z){const dx=x-cafe.a[0],dz=z-cafe.a[1],c=Math.cos(cafe.angle),s=Math.sin(cafe.angle);return [dx*c+dz*s,-dx*s+dz*c];}
function world(u,v){const c=Math.cos(cafe.angle),s=Math.sin(cafe.angle);return [cafe.a[0]+c*u-s*v,cafe.a[1]+s*u+c*v];}
const lamps=[world(15.2,-.9),world(29,-.9)];
const terraceTree=[...world(-10,5.9),17,5.8];trees.push(terraceTree);
const facadeDoors=[[-4.7,-1.3],[8.5,10.1],[23,24.6]];
const facadeWalls=[[-14.2,-4.7],[-1.3,8.5],[10.1,23],[24.6,32.8]];
function inside(p,x,z){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;}
function pathDistance(x,z){let d=1e6;for(let i=1;i<avenue.length;i++){const a=avenue[i-1],b=avenue[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz));}return d;}
function frame(g,x=0,z=0,a=0){const c=Math.cos(a),s=Math.sin(a),at=(u,y,v)=>[x+c*u-s*v,y,z+s*u+c*v];
 const q=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat),tri=(a,b,c,col,mat=7)=>g.tri(at(...a),at(...b),at(...c),col,mat);
 function box(u,y,v,w,h,d,col,mat=7){const p=[[u-w/2,y,v-d/2],[u+w/2,y,v-d/2],[u+w/2,y,v+d/2],[u-w/2,y,v+d/2]];for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];q(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}q([u-w/2,y+h,v-d/2],[u-w/2,y+h,v+d/2],[u+w/2,y+h,v+d/2],[u+w/2,y+h,v-d/2],col,mat);}
 function cone(u,y,v,r,h,col,n=10,top=0,mat=16){for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,p=(a,r,y)=>[u+Math.cos(a)*r,y,v+Math.sin(a)*r];if(top)q(p(a,r,y),p(b,r,y),p(b,top,y+h),p(a,top,y+h),col,mat);else tri(p(a,r,y),p(b,r,y),[u,y+h,v],col,mat);}}
 function oval(u,y,v,rx,ry,rz,col,mat=16){const p=(i,j)=>{const a=i*Math.PI/4,b=-Math.PI/2+j*Math.PI/3;return [u+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,v+Math.sin(a)*Math.cos(b)*rz];};for(let j=0;j<3;j++)for(let i=0;i<8;i++)q(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
 return {at,q,tri,box,cone,oval,beam:(a,b,r,col=C.dark,mat=7,n=6)=>g.beam(at(...a),at(...b),r,col,mat,n)};
}
function blossom(t,x,y,z,col,r=.13){for(let i=0;i<5;i++){const a=i*Math.PI*.4,b=a+.85;t.tri([x,y+.025,z],[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],col);}t.cone(x,y+.026,z,r*.20,.025,C.yellow,5,0,7);}
function shrub(t,x,y,z,r,col=C.green){t.oval(x,y+r*.50,z,r,r*.48,r*.85,col);}
function thuja(t,x,z,h,r){for(let i=0;i<4;i++)t.cone(x,.16+i*h*.19,z,r*(1-i*.19),h*(.60-i*.045),i%2?[.12,.28,.14]:[.10,.25,.12],12,0,16);
 for(let i=0;i<8;i++){const y=.5+i*h/10,a=i*2.4,rr=r*(1-y/(h+.4))*.85,size=.13*(1-y/h)+.045;t.oval(x+Math.cos(a)*rr,y,z+Math.sin(a)*rr,size,size*1.6,size,[.15,.30,.15],16);}}
function stoneEdge(g,a,b,raisedEnds=false){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=frame(g,a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0]));
 t.box(len/2,0,0,len,.39,.40,[.59,.48,.37],1);t.box(len/2,.39,0,len,.065,.46,C.white,1);
 for(let row=0;row<3;row++)for(let u=-.26+row%2*.23;u<len;u+=.48){const l=Math.max(0,u),r=Math.min(len,u+.455),shade=.88+.16*Math.sin(u*7+row*13);if(r<=l)continue;const col=[.62,.51,.40].map(v=>v*shade);t.q([l,.025+row*.12,-.207],[r,.025+row*.12,-.207],[r,.13+row*.12,-.207],[l,.13+row*.12,-.207],col,1);}
 if(raisedEnds)for(const end of [0,1])for(let i=0;i<10;i++){
  const a=i*.16,b=(i+1)*.16,height=u=>.43+.93*(1-u/1.6)**2,ua=end?len-a:a,ub=end?len-b:b,ha=height(a),hb=height(b);
  for(const v of [-.205,.205])t.q([ua,.39,v],[ub,.39,v],[ub,hb,v],[ua,ha,v],[.59,.48,.37],1);
  t.q([ua,ha,-.23],[ub,hb,-.23],[ub,hb,.23],[ua,ha,.23],C.white,1);
  if(i===0)t.q([ua,.39,-.205],[ua,ha,-.205],[ua,ha,.205],[ua,.39,.205],[.59,.48,.37],1);
 }
}
function flowerRibbon(t,a,b,n,rows=2){for(let i=0;i<n;i++){const u=(i+.3)/n,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;for(let j=0;j<rows;j++){const xx=x-.35-j*.40,zz=z+j*.12,r=.24+(i%3)*.035;shrub(t,xx,.17,zz,r,i%3?[.25,.40,.20]:[.48,.54,.42]);for(let k=0;k<3;k++)blossom(t,xx+(k-1)*.15,.45+(i%2)*.035,zz+Math.sin(k*2+i)*.13,[C.white,C.yellow,C.pink,[.78,.25,.35]][(i+j)%4],.12);}}}
function bench(g,x,z){const t=frame(g,x,z,-.24);for(let i=0;i<4;i++){t.box(0,.45,-.21+i*.12,1.95,.065,.095,C.wood,12);t.box(0,.64+i*.115,.24,1.95,.075,.06,C.wood,12);}for(const u of [-.75,.75]){t.beam([u,.03,-.16],[u,.46,-.16],.045);t.beam([u,.03,.19],[u,1.04,.27],.045);}}
function garden(g){const t=frame(g);
 // Clad the existing foreground bed, then continue with a separate bed and a bench gap.
 stoneEdge(g,[20.5,-329],[27,-304]);flowerRibbon(t,[20.5,-327.5],[26.7,-305],40);
 for(let i=0;i<5;i++)thuja(t,20.8+i*1.10,-324+i*4.6,4.1+i%2*.8,.87);
 stoneEdge(g,bed[0],bed[1]);stoneEdge(g,bed[1],bed[2],true);stoneEdge(g,bed[2],bed[3]);stoneEdge(g,bed[3],bed[0],true);
 for(let i=1;i<bed.length-1;i++)t.tri([bed[0][0],.045,bed[0][1]],[bed[i][0],.045,bed[i][1]],[bed[i+1][0],.045,bed[i+1][1]],[.22,.30,.15],16);
 flowerRibbon(t,[29.5,-294.5],[35.2,-275.5],34,3);
 for(let i=0;i<4;i++)thuja(t,28.1+i*1.24,-291.2+i*4.8,4.7+i%2*.5,.90);
 for(const [x,z] of [[25.5,-310.5],[28.1,-286],[30.5,-277.5]]){shrub(t,x,.1,z,1.05);for(let i=0;i<6;i++)blossom(t,x+Math.cos(i*2.4)*.60,1.0,z+Math.sin(i*2.4)*.56,i%2?C.white:C.pink,.22);}
 for(const [x,z] of benches)bench(g,x,z);
 // The green object is an ice-cream kiosk, with a broad white fascia.
 const n=frame(g,...notice,-.24);n.box(0,.04,0,2.6,2.38,1.85,[.48,.65,.22],1);n.box(0,2.42,0,3.15,.48,2.2,C.white,1);
 n.box(-.34,.95,-.947,1.35,1.07,.045,[.12,.18,.16]);n.box(-.34,.91,-1.03,1.58,.075,.33,C.white);
 for(const x of [-1.06,.38])n.box(x,.91,-.987,.055,1.16,.07,C.white);
 n.box(-.34,2.03,-.987,1.50,.055,.07,C.white);n.box(-.34,1.50,-.988,.035,.52,.07,C.white);
 // A flat cone emblem reproduces the visible pictogram without inventing a shop name.
 n.tri([.65,1.15,-.953],[1.08,1.15,-.953],[.88,.43,-.953],[.79,.51,.22]);
 for(let i=0;i<4;i++){const y=1.20+i*.16,r=.29-i*.055;n.q([.88-r,y,-.956],[.88+r,y,-.956],[.88+r*.6,y+.17,-.956],[.88-r*.6,y+.17,-.956],i%2?C.white:[.22,.22,.20]);}
 const trash=frame(g,...bin,-.24);trash.box(0,.08,0,.45,.77,.45,[.24,.25,.20],2);trash.box(0,.86,0,.50,.055,.50,C.dark,2);trash.box(0,.76,-.233,.31,.095,.025,[.07,.10,.08]);for(const x of [-.24,.24])trash.box(x,.015,0,.035,.88,.035,C.dark,2);
 for(const [x,z] of lamps){t.beam([x,.02,z],[x,6.8,z],.065,[.52,.55,.52],2,8);t.beam([x,6.78,z],[x-.62,7.15,z+.10],.045,[.52,.55,.52],2,6);t.box(x-.70,7.08,z+.10,.45,.10,.18,[.77,.77,.66],2);}
 // Open turquoise support bays visible through the lawn; no solid wall below the rail.
 for(const z of [-316,-306])for(const x of [7,13,19]){t.beam([x,.02,z],[x,2.95,z],.055,[.10,.53,.53]);if(x<19)t.beam([x,2.95,z],[x+6,2.95,z],.055,[.10,.53,.53]);}
}
function palm(t,u,v){t.cone(u,.03,v,.39,.62,[.57,.36,.20],10,.46,12);t.beam([u,.64,v],[u+.08,2.65,v],.07,[.37,.29,.18],12,8);
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9;for(let j=0;j<4;j++){const f=j/4,h=(j+1)/4,p=(r,y,w)=>[u+.08+Math.cos(a)*r-Math.sin(a)*w,y,v+Math.sin(a)*r+Math.cos(a)*w];t.q(p(.2+f*1.45,2.72+Math.sin(f*Math.PI)*.40-f*.35,.22*(1-f)),p(.2+h*1.45,2.72+Math.sin(h*Math.PI)*.40-h*.35,.22*(1-h)),p(.2+h*1.45,2.72+Math.sin(h*Math.PI)*.40-h*.35,-.22*(1-h)),p(.2+f*1.45,2.72+Math.sin(f*Math.PI)*.40-f*.35,-.22*(1-f)),i%2?[.16,.35,.18]:[.22,.42,.18],16);}}}
const glyphs={'К':[[0,0,0,1],[0,.5,1,1],[0,.5,1,0]],'А':[[0,0,.5,1],[.5,1,1,0],[.2,.4,.8,.4]],'Ф':[[.5,0,.5,1],[.5,.2,0,.3],[0,.3,0,.8],[0,.8,1,.8],[1,.8,1,.3],[1,.3,.5,.2]],'Е':[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]],'Т':[[0,1,1,1],[.5,1,.5,0]],'Р':[[0,0,0,1],[0,1,1,1],[1,1,1,.5],[1,.5,0,.5]],'О':[[0,0,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0]],'П':[[0,0,0,1],[0,1,1,1],[1,1,1,0]],'И':[[0,0,0,1],[0,0,1,1],[1,1,1,0]],'Н':[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]]};
function text(t,word,u,y,v,h){const step=h*.8;for(let i=0;i<word.length;i++)for(const [a,b,c,d] of glyphs[word[i]]||[])t.beam([u-((i-word.length/2)*step+a*h*.55),y+b*h,v],[u-((i-word.length/2)*step+c*h*.55),y+d*h,v],h*.022,C.white,7,4);}
function cafeDetails(g){const t=frame(g,...cafe.a,cafe.angle);
 for(const u of cafe.planters){for(let i=0;i<5;i++){const x=u-1.20+i*.60;shrub(t,x,.59,0,.32,[.30,.42,.23]);for(let j=0;j<2;j++)blossom(t,x+(j-.5)*.14,.94,Math.sin(i+j)*.12,i%2?C.white:[.73,.70,.51],.11);}
  for(const v of [1.8,4.5]){t.q([u-.86,.851,v-.50],[u+.86,.851,v-.50],[u+.86,.851,v+.50],[u-.86,.851,v+.50],[.88,.79,.73],17);for(const sign of [-1,1])t.q([u-.86,.85,v+sign*.50],[u+.86,.85,v+sign*.50],[u+.81,.58,v+sign*.50],[u-.81,.58,v+sign*.50],[.80,.61,.59],17);for(let i=0;i<4;i++)for(let j=0;j<2;j++)blossom(t,u-.61+i*.4,.855,v-.25+j*.48,C.pink,.075);}
 }
 for(const u of [-10.0,3.7,12.9,22.1,31.1])palm(t,u,4.0);
 for(const u of [8.3,17.5,26.7]){t.box(u,.04,2.1,.72,.73,.70,[.63,.43,.23],12);shrub(t,u,.76,2.1,.40);}
 // Deep shaded arches replace the flat window strip behind the terrace.
 const wall=[.76,.68,.55];
 for(const [a,b] of facadeWalls){
  t.box((a+b)/2,.04,7.4,b-a,2.70,.20,wall,1);
  for(let u=a+1.5;u<b-1.0;u+=3.0){
   const points=[[u-.99,.16,7.277],[u+.99,.16,7.277],[u+.99,1.40,7.277]];
   for(let i=1;i<=10;i++){const angle=i*Math.PI/10;points.push([u+Math.cos(angle)*.99,1.40+Math.sin(angle)*.99,7.277]);}
   for(let i=1;i<points.length-1;i++)t.tri(points[0],points[i],points[i+1],[.12,.15,.13]);
   for(let i=1;i<points.length;i++)t.beam(points[i-1],points[i],.025,[.58,.48,.35],12,4);
   t.beam(points.at(-1),points[0],.025,[.58,.48,.35],12,4);
   t.box(u,.09,7.13,2.12,.07,.45,[.47,.38,.27],1);
  }
 }
 for(const [a,b] of facadeDoors){t.box((a+b)/2,2.51,7.4,b-a,.23,.20,wall,1);for(const u of [a,b])t.box(u,.05,7.28,.11,2.46,.22,[.60,.53,.40],12);}
 const frontLength=32.8-cafe.start,frontMid=(cafe.start+32.8)/2;
 t.box(frontMid,2.74,7.4,frontLength+.30,.17,1.15,[.27,.22,.18],14);
 // The photographed continuation is a low annex, open through the central doorway.
 t.box(-7.1,.04,15.05,14.2,2.70,.20,wall,1);for(const u of [cafe.start,0])t.box(u,.04,11.35,.20,2.70,7.4,wall,1);t.box(-7.1,2.76,11.35,14.7,.17,8.1,[.26,.23,.18],14);
 // A recessed dark entrance is behind the usable doorway, not across it.
 t.box(cafe.entrance.u,.04,8.2,cafe.entrance.doorWidth,2.43,.045,[.09,.12,.10]);
 const p=world(25.7,-.75),board=frame(g,p[0],p[1],cafe.angle);board.box(0,.05,0,.84,1.26,.12,C.dark);for(const x of [-.44,.44])board.beam([x,.03,.17],[x,1.32,0],.022,C.wood,12);text(board,'КАФЕ',.03,1.02,-.071,.15);text(board,'ТРОПИКАНКА',.02,.81,-.071,.075);for(let y=.25;y<.72;y+=.12)board.beam([-.32,y,-.071],[.26-Math.sin(y*15)*.05,y,-.071],.006,C.white,7,4);
}
function planterAt(x,z){const [u,v]=local(x,z);return Math.abs(v)<.40&&cafe.planters.some(p=>Math.abs(u-p)<1.73);}
function clearsTree(x,z){return z>-332&&z<-257&&(inside(bed,x,z)||(x>16&&x<31&&z>-323&&z<-278)||pathDistance(x,z)<5.0||trees.some(t=>Math.hypot(x-t[0],z-t[1])<2.5)||(()=>{const [u,v]=local(x,z);return u>cafe.start-.5&&u<33.5&&v>-.8&&v<15.5;})());}
function applyGround(cats,park){const posts=[-316,-306].flatMap(z=>[7,13,19].map(x=>[x,z]));
 for(let iz=Math.max(0,Math.floor((-331-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-254-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((4-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((66-park.x0)/park.mpp));ix++){
  const index=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,old=cats[index]&31,[u,v]=local(x,z);
  // The geometry and collision mask share the same terrace layout.
  if(u>cafe.start-.5&&u<33.5&&v>-.52&&v<7.20&&![4,12].includes(old))cats[index]=66;
  if(Math.abs(u-cafe.entrance.u)<cafe.entrance.width/2&&v> -1.5&&v<7.2)cats[index]=66;
  if(facadeDoors.some(([a,b])=>u>a+.1&&u<b-.1)&&v>7.0&&v<8.0)cats[index]=66;
  if(pathDistance(x,z)<4.5&&![4,5,12].includes(cats[index]&31))cats[index]=67;
  if(x>15&&x<33&&Math.abs(z+298.8)<1.2&&![4,5,12].includes(cats[index]&31))cats[index]=67;
  if(inside(bed,x,z))cats[index]=77;
  if(planterAt(x,z)||benches.some(p=>Math.abs(x-p[0])<1.05&&Math.abs(z-p[1])<.5)||posts.some(p=>Math.hypot(x-p[0],z-p[1])<.26))cats[index]=77;
  if(u>cafe.start&&u<32.8&&Math.abs(v-7.4)<.22&&!facadeDoors.some(([a,b])=>u>a&&u<b))cats[index]=69;
  if(u>cafe.start&&u<0&&v>7.6&&v<15.1&&!(facadeDoors[0][0]+.1<u&&u<facadeDoors[0][1]-.1&&v<8.1))cats[index]=69;
  if([8.3,17.5,26.7].some(p=>Math.abs(u-p)<.39)&&Math.abs(v-2.1)<.38)cats[index]=77;
  if([-10,3.7,12.9,22.1,31.1].some(p=>Math.abs(u-p)<.48)&&Math.abs(v-4)<.48)cats[index]=77;
  if(Math.abs(u-25.7)<.48&&Math.abs(v+.75)<.18)cats[index]=77;
  if(Math.abs(x-notice[0])<1.60&&Math.abs(z-notice[1])<1.15||Math.abs(x-bin[0])<.34&&Math.abs(z-bin[1])<.34||lamps.some(p=>Math.hypot(x-p[0],z-p[1])<.23))cats[index]=77;
 }
}
const api={bed,trees,benches,notice,bin,lamps,cafe,facadeDoors,local,world,planterAt,pathDistance,clearsTree,garden,cafeDetails,applyGround};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkAvenueGardens=api;
})(typeof window!=='undefined'?window:globalThis);
