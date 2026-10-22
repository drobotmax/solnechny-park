// Static carriage ride, reconstructed from two user-supplied panorama views.
(function(root){
'use strict';
const ART={tower:[0,0,512,768],coach:[512,0,1024,256],hub:[512,256,1024,512]};
const C={yellow:[.96,.68,.12],gold:[.83,.52,.09],pink:[.82,.20,.47],red:[.69,.13,.16],
 green:[.12,.36,.23],white:[.94,.93,.84],blue:[.15,.43,.58],steel:[.46,.51,.52],dark:[.10,.12,.13]};
function layout(e){
 let radius=Infinity;
 for(let i=0;i<e.pts.length;i++){
  const a=e.pts[i],b=e.pts[(i+1)%e.pts.length],dx=b[0]-a[0],dz=b[1]-a[1];
  radius=Math.min(radius,Math.abs(dx*(e.cz-a[1])-dz*(e.cx-a[0]))/Math.hypot(dx,dz));
 }
 const scale=radius/5.35,front=[-1,-.13],length=Math.hypot(...front);
 front[0]/=length;front[1]/=length;
 const right=[front[1],-front[0]];
 return {radius,scale,front,right,at:(x,y,z)=>[e.cx+scale*(right[0]*x+front[0]*z),y*scale,e.cz+scale*(right[1]*x+front[1]*z)]};
}
function imageQuad(g,a,b,c,d,region,u0=0,u1=1){
 const offset=g.data.length,[left,top,right,bottom]=region;
 g.quad(a,b,c,d,[0,0,0],9);
 const x0=left+(right-left)*u0,x1=left+(right-left)*u1;
 const uv=[[x0,bottom],[x1,bottom],[x1,top],[x0,bottom],[x1,top],[x0,top]];
 for(let i=0;i<6;i++){g.data[offset+i*10+6]=uv[i][0]/1024;g.data[offset+i*10+7]=uv[i][1]/1024;}
}
function build(g,e){
 const f=layout(e),at=f.at;
 const beam=(a,b,r,c,m=10,sides=4)=>g.beam(at(...a),at(...b),r*f.scale,c,m,sides);
 const quad=(a,b,c,d,col,m=10)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,m);
 const circle=(a,r,y)=>[Math.sin(a)*r,y,Math.cos(a)*r];
 function box(x,y,z,w,h,d,col,m=10){
  const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,m);}
  quad([p[0][0],y+h,p[0][2]],[p[3][0],y+h,p[3][2]],[p[2][0],y+h,p[2][2]],[p[1][0],y+h,p[1][2]],col,m);
 }
 function bulb(p,r,col){
  const axes=[[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]];
  const points=axes.map(a=>at(p[0]+a[0],p[1]+a[1],p[2]+a[2]));
  for(const t of [[0,2,4],[4,2,1],[1,2,5],[5,2,0],[0,4,3],[4,1,3],[1,5,3],[5,0,3]])g.tri(points[t[0]],points[t[1]],points[t[2]],col,10);
 }
 function ring(radius,y,thickness,color,segments=48){
  for(let i=0;i<segments;i++)beam(circle(i*Math.PI*2/segments,radius,y),circle((i+1)*Math.PI*2/segments,radius,y),thickness,color,10,4);
 }
 function frustum(low,high,y0,y1,color,art){
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+Math.PI/8,b=(i+1)*Math.PI/4+Math.PI/8;
   const p=[circle(a,low,y0),circle(b,low,y0),circle(b,high,y1),circle(a,high,y1)];
   if(art)imageQuad(g,...p.map(v=>at(...v)),art);else quad(...p,color);
  }
 }
 // Metal turntable and the low red-and-gold central mechanism.
 for(let i=0;i<64;i++){
  const a=i*Math.PI/32,b=(i+1)*Math.PI/32;
  g.tri(at(0,.16,0),at(...circle(a,5.12,.16)),at(...circle(b,5.12,.16)),[.57,.59,.57],2);
  quad(circle(a,5.12,.02),circle(b,5.12,.02),circle(b,5.12,.16),circle(a,5.12,.16),C.dark);
 }
 frustum(.72,1.32,.25,1.13,C.red);frustum(1.32,1.37,1.13,1.46,C.red);
 frustum(1.37,.83,1.46,2.02,C.yellow,ART.hub);frustum(.83,.60,2.02,2.55,C.red);
 for(const [r,y] of [[.78,.3],[1.32,1.12],[1.38,1.45],[.84,2.02]])ring(r,y,.045,C.gold,24);
 // Four painted tapered panels with arched marquee tops.
 for(let side=0;side<4;side++){
  const angle=side*Math.PI/2,ca=Math.cos(angle),sa=Math.sin(angle);
  const rotate=p=>[p[0]*ca+p[2]*sa,p[1],-p[0]*sa+p[2]*ca];
  const face=(u,v)=>rotate([(u-.5)*2*(.53+(1.65-.53)*v),2.47+(2.78+.44*Math.sin(u*Math.PI))*v,.53+1.12*v]);
  for(let i=0;i<8;i++){
   const u=i/8,v=(i+1)/8;
   imageQuad(g,at(...face(u,0)),at(...face(v,0)),at(...face(v,1)),at(...face(u,1)),ART.tower,u,v);
   beam(face(u,1),face(v,1),.075,C.yellow);
  }
  beam(face(0,0),face(1,0),.10,C.red);
  for(const u of [0,1])beam(face(u,0),face(u,1),.115,C.yellow);
  for(let i=0;i<13;i++){
   const u=(i+.5)/13,p=face(u,1);p[1]-=.14;bulb(p,.047,i%2?C.white:C.red);
  }
  for(const u of [.025,.975])for(let i=0;i<8;i++)bulb(face(u,.12+i*.10),.045,i%2?C.yellow:C.red);
 }
 // Four outward arms and white swan ornaments above the carriage roofs.
 function swan(x,z,a){
  const ux=Math.cos(a),uz=-Math.sin(a),point=(s,y)=>[x+ux*s,y,z+uz*s];
  for(let i=0;i<6;i++){
   const spread=-.8+i*.24;
   beam(point(.05,5.54),point(spread,6.25+(.5-Math.abs(spread))*.24),.10,C.white,10,4);
  }
  const neck=[[.05,5.58],[.32,5.94],[.40,6.32],[.34,6.66],[.15,6.88],[-.04,6.91],[-.17,6.83]];
  for(let i=0;i+1<neck.length;i++)beam(point(...neck[i]),point(...neck[i+1]),.065,C.white,10,5);
  bulb(point(-.17,6.83),.09,C.white);bulb(point(-.20,6.85),.018,C.dark);
  beam(point(-.20,6.82),point(-.34,6.80),.027,C.gold,10,4);
 }
 for(let i=0;i<4;i++){
  const a=Math.PI/4+i*Math.PI/2,outer=circle(a,3.55,5.10),inner=circle(a,1.85,4.92);
  beam(inner,outer,.16,C.yellow,10,6);
  beam(circle(a,2.5,2.65),outer,.075,C.yellow);
  beam(circle(a,3.55,2.15),outer,.075,C.gold);
  beam(circle(a,3.55,2.30),circle(a,3.55,4.20),.115,C.pink);
  bulb(outer,.24,C.yellow);bulb([outer[0],outer[1],outer[2]+.02],.14,C.white);
  swan(outer[0],outer[2],a);
 }
 // Carriages keep their wheels and passenger cages, rather than generic blocks.
 function coach(angle,index){
  const center=circle(angle,3.48,0),tangent=[Math.cos(angle),-Math.sin(angle)],radial=[Math.sin(angle),Math.cos(angle)];
  const p=(x,y,z)=>[center[0]+tangent[0]*x+radial[0]*z,y,center[2]+tangent[1]*x+radial[1]*z];
  const color=[C.pink,C.red,C.green,C.blue][index];
  const q=(a,b,c,d,col,m=10)=>quad(p(...a),p(...b),p(...c),p(...d),col,m);
  for(const side of [-1,1]){
   q([-1.08,.67,side*.51],[1.08,.67,side*.51],[1.08,1.27,side*.51],[-1.08,1.27,side*.51],color);
   imageQuad(g,at(...p(-.97,.72,side*.525)),at(...p(.97,.72,side*.525)),at(...p(.97,1.18,side*.525)),at(...p(-.97,1.18,side*.525)),ART.coach,side<0?1:0,side<0?0:1);
   for(const y of [.65,1.29,1.65])beam(p(-1.12,y,side*.54),p(1.12,y,side*.54),.035,C.gold,10,3);
   for(const x of [-1.1,-.36,.36,1.1])beam(p(x,1.27,side*.54),p(x,1.68,side*.54),.028,C.gold,10,3);
  }
  q([-1.08,.67,-.51],[-1.08,.67,.51],[-1.08,1.27,.51],[-1.08,1.27,-.51],color);
  q([1.08,.67,.51],[1.08,.67,-.51],[1.08,1.27,-.51],[1.08,1.27,.51],color);
  q([-1.05,.68,-.5],[1.05,.68,-.5],[1.05,.68,.5],[-1.05,.68,.5],C.dark);
  for(const x of [-.55,.55]){
   q([x-.34,.86,-.42],[x+.34,.86,-.42],[x+.34,.86,.42],[x-.34,.86,.42],C.red);
   beam(p(x,.87,-.43),p(x,1.3,-.43),.065,C.red,10,4);
  }
  for(const x of [-.92,.92])for(const z of [-.46,.46])beam(p(x,1.26,z),p(x,2.37,z),.027,color,10,3);
  const roof=(a,y)=>p(Math.cos(a)*1.25,y,Math.sin(a)*.70);
  for(let i=0;i<16;i++){
   const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
   quad(roof(a,2.30),roof(b,2.30),roof(b,2.46),roof(a,2.46),color);
   g.tri(at(...p(0,2.52,0)),at(...roof(a,2.46)),at(...roof(b,2.46)),C.yellow,10);
  }
  for(const x of [-.92,.92]){
   bulb(p(x,2.55,0),.10,C.pink);
   for(const side of [-1,1]){
    const z=side*.65,cy=.65,r=.49;
    for(let j=0;j<16;j++){
     const a=j*Math.PI/8,b=(j+1)*Math.PI/8;
     beam(p(x+Math.cos(a)*r,cy+Math.sin(a)*r,z),p(x+Math.cos(b)*r,cy+Math.sin(b)*r,z),.026,C.gold,10,3);
    }
    for(let j=0;j<8;j++){
     const a=j*Math.PI/4;
     beam(p(x,cy,z),p(x+Math.cos(a)*r,cy+Math.sin(a)*r,z),.014,C.gold,10,3);
    }
    bulb(p(x,cy,z),.075,C.yellow);
   }
  }
  beam(p(-.9,.41,-.46),p(.9,.41,.46),.06,C.yellow);
 }
 for(let i=0;i<4;i++)coach(Math.PI/4+i*Math.PI/2,i);
 // Dracula-shaped finial and the small crown below it.
 beam([0,5.58,0],[0,6.10,0],.26,C.yellow,10,10);ring(.61,5.97,.065,C.white,20);
 for(let i=0;i<12;i++)beam(circle(i*Math.PI/6,.51,5.98),circle(i*Math.PI/6,.47,6.12),.033,C.white,10,4);
 box(0,6.10,0,.32,.66,.22,[.14,.11,.21]);
 quad([-.17,6.65,-.1],[.17,6.65,-.1],[.34,6.13,-.18],[-.34,6.13,-.18],[.20,.10,.25]);
 beam([-.10,6.12,0],[-.12,5.99,.02],.065,C.dark);beam([.1,6.12,0],[.14,5.99,.02],.065,C.dark);
 bulb([0,6.91,.01],.155,[.77,.77,.65]);
 beam([0,7.02,.01],[0,7.20,.01],.15,C.dark,10,10);ring(.20,7.02,.024,C.dark,16);
 beam([-.14,6.64,0],[-.29,6.35,.01],.055,[.14,.11,.21]);beam([.14,6.64,0],[.35,6.48,.04],.055,[.14,.11,.21]);
 // Green wire fence with an opening toward the ticket office.
 const fenceR=5.22;
 for(let i=0;i<48;i++){
  const a=i*Math.PI/24,b=(i+1)*Math.PI/24,mid=(a+b)/2;
  if(Math.min(mid,Math.PI*2-mid)<.19)continue;
  for(const y of [.24,1.49])beam(circle(a,fenceR,y),circle(b,fenceR,y),.022,C.green,10,4);
  beam(circle(a,fenceR,.23),circle(a,fenceR,1.5),i%4===0?.043:.010,C.green,10,3);
  const c=(a+b)/2;beam(circle(c,fenceR,.23),circle(c,fenceR,1.49),.009,C.green,10,3);
  for(const y of [.65,1.05])beam(circle(a,fenceR,y),circle(b,fenceR,y),.008,C.green,10,3);
 }
 // A blue translucent-looking arched entry canopy stays below the tall sculpture.
 const centerX=1.17;
 for(const x of [-.10,2.44])for(const z of [4.0,5.15])beam([x,.18,z],[x,2.50,z],.055,C.green,10,6);
 for(let i=0;i<16;i++){
  const a=-Math.PI/2+i*Math.PI/16,b=-Math.PI/2+(i+1)*Math.PI/16;
  const p=(t,z)=>[centerX+Math.sin(t)*1.46,2.42+Math.cos(t)*.53,z];
  quad(p(a,3.88),p(b,3.88),p(b,5.28),p(a,5.28),[.37,.62,.71],3);
  for(const z of [3.88,5.28])beam(p(a,z),p(b,z),.024,C.blue,10,4);
 }
 box(2.65,.18,4.50,.52,1.11,.48,C.yellow);
 box(2.61,.20,4.17,.32,.48,.10,C.dark);
}
function atlas(){
 const cv=document.createElement('canvas');cv.width=cv.height=1024;
 const c=cv.getContext('2d');c.fillStyle='#122a40';c.fillRect(0,0,1024,1024);
 function ellipse(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 function character(x,y,s,kind){
  c.save();c.translate(x,y);c.scale(s,s);
  const cape=kind===0?'#101c30':kind===1?'#cf7247':kind===2?'#c6cab6':'#74574b';
  c.fillStyle=cape;c.beginPath();c.moveTo(-30,5);c.lineTo(-65,150);c.lineTo(60,150);c.lineTo(28,5);c.closePath();c.fill();
  ellipse(0,0,23,36,kind===3?'#937863':'#dad6bd');
  if(kind===0){
   c.fillStyle='#111827';c.beginPath();c.moveTo(-24,-8);c.lineTo(-18,-38);c.lineTo(22,-35);c.lineTo(24,-4);c.lineTo(7,-24);c.lineTo(0,-15);c.lineTo(-8,-25);c.closePath();c.fill();
   c.fillStyle='#643963';c.beginPath();c.moveTo(-30,6);c.lineTo(0,48);c.lineTo(31,6);c.lineTo(18,71);c.lineTo(-16,71);c.fill();
  }else if(kind===1){
   ellipse(-24,-2,10,39,'#c86d35');ellipse(22,-7,12,35,'#b76031');
  }else if(kind===2){
   c.strokeStyle='#8d9e97';c.lineWidth=3;
   for(let i=0;i<7;i++){c.beginPath();c.moveTo(-23,-22+i*8);c.lineTo(23,-31+i*8);c.stroke();}
  }else{ellipse(0,20,17,13,'#bda783');}
  for(const side of [-1,1]){ellipse(side*8,-4,3,4,'#f9faf2');ellipse(side*8,-3,1.7,2.5,'#1b2730');}
  c.strokeStyle='#645466';c.lineWidth=2;c.beginPath();c.moveTo(-7,17);c.quadraticCurveTo(0,21,7,15);c.stroke();
  c.restore();
 }
 const sky=c.createLinearGradient(0,0,0,768);sky.addColorStop(0,'#65a6bd');sky.addColorStop(.45,'#143348');sky.addColorStop(1,'#071727');
 c.fillStyle=sky;c.fillRect(0,0,512,768);
 c.strokeStyle='#d4a441';c.lineWidth=12;c.strokeRect(10,12,492,742);
 // Marquee stripes and deliberately redrawn character art, without panorama pixels.
 for(let y=18;y<210;y+=36){c.fillStyle='#78b5ce';c.fillRect(20,y,472,14);}
 c.fillStyle='#e2e4cb';c.fillRect(34,95,444,86);c.strokeStyle='#a42f4b';c.lineWidth=4;c.strokeRect(34,95,444,86);
 c.save();c.translate(45,140);c.font='bold 49px Georgia,serif';c.textBaseline='middle';
 c.scale(422/c.measureText('HOTEL TRANSYLVANIA').width,1);c.fillStyle='#243949';c.fillText('HOTEL TRANSYLVANIA',0,0);c.restore();
 for(let i=0;i<15;i++)for(const y of [28,198])ellipse(33+i*32,y,7,7,i%2?'#eee7b8':'#a62645');
 character(147,448,1.10,1);character(260,387,1.66,0);character(366,469,1.05,2);character(87,565,.70,3);
 c.fillStyle='#173d44';c.beginPath();c.moveTo(20,718);c.quadraticCurveTo(230,651,492,710);c.lineTo(492,755);c.lineTo(20,755);c.fill();
 c.fillStyle='#23573f';c.fillRect(512,0,512,256);c.strokeStyle='#d0a640';c.lineWidth=10;c.strokeRect(519,7,498,242);
 for(let i=0;i<4;i++)character(575+i*125,92,.76,i);
 c.fillStyle='#3d7567';c.fillRect(512,256,512,256);
 c.fillStyle='#7ba3a0';c.beginPath();c.moveTo(512,415);c.quadraticCurveTo(780,310,1024,417);c.lineTo(1024,503);c.lineTo(512,503);c.fill();
 for(let i=0;i<5;i++){
  c.fillStyle=i%2?'#365044':'#263e35';c.fillRect(560+i*91,314,44,128);
  c.beginPath();c.moveTo(546+i*91,315);c.lineTo(582+i*91,274-i%2*24);c.lineTo(618+i*91,315);c.fill();
 }
 c.strokeStyle='#d5a547';c.lineWidth=10;c.strokeRect(519,263,498,242);
 return cv;
}
const api={layout,build,atlas};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkTransylvania=api;
})(typeof window!=='undefined'?window:globalThis);
