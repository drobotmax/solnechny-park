// A solid, reference-shaped pram. Local ground is y=0; forward is -z.
(function(root){
'use strict';
const spec={length:1.10,width:.58,axle:.58*.38,wheels:[{z:-1.10*.36,radius:1.10*.065,front:true},{z:1.10*.19,radius:1.10*.08,front:false}]};
const C={cloth:[.80,.80,.75],lining:[.35,.38,.36],dark:[.095,.115,.115],metal:[.30,.34,.34],rubber:[.075,.085,.085],rim:[.39,.43,.43],seam:[.52,.55,.52]};
function tube(g,a,b,r,col=C.metal,mat=2,n=8){
 const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d),t=d.map(v=>v/len),axis=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];
 let u=[t[1]*axis[2]-t[2]*axis[1],t[2]*axis[0]-t[0]*axis[2],t[0]*axis[1]-t[1]*axis[0]],ul=Math.hypot(...u);u=u.map(v=>v/ul);
 const v=[t[1]*u[2]-t[2]*u[1],t[2]*u[0]-t[0]*u[2],t[0]*u[1]-t[1]*u[0]],ring=(p,k)=>p.map((x,i)=>x+r*(u[i]*Math.cos(k*Math.PI*2/n)+v[i]*Math.sin(k*Math.PI*2/n)));
 for(let k=0;k<n;k++){const p=ring(a,k),q=ring(a,k+1),s=ring(b,k),t=ring(b,k+1);g.quad(p,q,t,s,col,mat);g.tri(a,q,p,col,mat);g.tri(b,s,t,col,mat);}
}
function rounded(hw,z0,z1,r,y){const p=[];for(const [x,z,a] of [[hw-r,z1-r,0],[-hw+r,z1-r,Math.PI/2],[-hw+r,z0+r,Math.PI],[hw-r,z0+r,Math.PI*1.5]])for(let i=0;i<=5;i++){const t=a+i*Math.PI/10;p.push([x+Math.cos(t)*r,y,z+Math.sin(t)*r]);}return p;}
function connect(g,a,b,col,mat){for(let i=0;i<a.length;i++){const j=(i+1)%a.length;g.quad(a[i],a[j],b[j],b[i],col,mat);}}
function cap(g,ring,col,mat){const c=ring.reduce((a,p)=>a.map((x,i)=>x+p[i]/ring.length),[0,0,0]);for(let i=0;i<ring.length;i++)g.tri(c,ring[i],ring[(i+1)%ring.length],col,mat);}
function softBox(g,hw,z0,z1,r,y0,y1,col){const a=rounded(hw*.92,z0+.015,z1-.015,r,y0),b=rounded(hw,z0,z1,r,y1);connect(g,a,b,col,17);cap(g,a,col,17);cap(g,b,col,17);}
function piping(g,ring,r=.004,col=C.seam){for(let i=0;i<ring.length;i++)tube(g,ring[i],ring[(i+1)%ring.length],r,col,17,4);}
function ellipsoid(g,c,r,col,mat=17){const at=(i,j)=>{const a=i*Math.PI/6,b=-Math.PI/2+j*Math.PI/6;return [c[0]+Math.cos(a)*Math.cos(b)*r[0],c[1]+Math.sin(b)*r[1],c[2]+Math.sin(a)*Math.cos(b)*r[2]];};for(let j=0;j<6;j++)for(let i=0;i<12;i++)g.quad(at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1),col,mat);}
function donut(g,r,halfWidth,bulge,col,mat=18,at=p=>p,n=32,m=8){const p=(i,j)=>{const a=i*Math.PI*2/n,b=j*Math.PI*2/m,rad=r-bulge+Math.sin(b)*bulge;return at([Math.cos(b)*halfWidth,Math.cos(a)*rad,Math.sin(a)*rad]);};for(let i=0;i<n;i++)for(let j=0;j<m;j++)g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
function body(g){
 // Four complete surfaces form the fabric-sided carrycot and its dark interior.
 const bottom=rounded(.225,-.405,.245,.085,.465),band=rounded(.243,-.429,.268,.09,.545),top=rounded(.260,-.445,.285,.10,.745),inner=rounded(.240,-.425,.265,.085,.725),floor=rounded(.215,-.397,.232,.075,.580);
 connect(g,bottom,band,C.dark,17);connect(g,band,top,C.cloth,17);connect(g,top,inner,[.88,.87,.81],17);connect(g,inner,floor,C.lining,17);cap(g,bottom,C.dark,17);cap(g,floor,C.lining,17);piping(g,top,.006,[.70,.72,.67]);
 // A neutral folded cover fills the foot end; no photographed person is used.
 softBox(g,.220,-.025,.265,.075,.665,.702,[.73,.74,.68]);
 for(const z of [.10,.19])tube(g,[-.19,.708,z],[.19,.708,z+.008],.0025,[.62,.64,.59],17,4);
 // Rounded canopy, lined inside and joined around all four boundaries.
 const hood=(u,j,inside=false)=>{const a=j*Math.PI/16,dy=.065+.335*Math.sin(u*Math.PI/2),w=inside?.247:.255;return [Math.cos(a)*w,.735+Math.sin(a)*dy-(inside?.008:0),-.445+.535*u];};
 for(let i=0;i<8;i++)for(let j=0;j<16;j++){const a=i/8,b=(i+1)/8;g.quad(hood(a,j),hood(b,j),hood(b,j+1),hood(a,j+1),C.cloth,17);g.quad(hood(a,j,true),hood(a,j+1,true),hood(b,j+1,true),hood(b,j,true),[.47,.50,.46],17);}
 for(const u of [0,1])for(let j=0;j<16;j++)g.quad(hood(u,j),hood(u,j+1),hood(u,j+1,true),hood(u,j,true),C.seam,17);
 for(const j of [0,16])for(let i=0;i<8;i++)g.quad(hood(i/8,j),hood(i/8,j,true),hood((i+1)/8,j,true),hood((i+1)/8,j),C.seam,17);
 for(const u of [.32,.66,1])for(let j=0;j<16;j++)tube(g,hood(u,j),hood(u,j+1),u===1?.006:.0028,u===1?[.68,.70,.65]:[.73,.74,.69],17,4);
 // Crossed chassis, carrycot mounts and a foam-covered push handle.
 for(const side of [-1,1]){const x=side*.205;
  tube(g,[x,.12,-.396],[x,.59,.195],.012);tube(g,[x,.11,.209],[x,.63,-.240],.013);
  tube(g,[x,.20,-.30],[side*spec.axle,spec.wheels[0].radius+.145,-.396],.013);
  tube(g,[x,.57,-.260],[x,.57,.220],.012);tube(g,[x,.43,.16],[side*.245,.985,.475],.014);
  tube(g,[side*.245,.985,.475],[side*.210,1.005,.505],.015,C.dark,18);
  for(const z of [-.25,.19])tube(g,[x,.545,z],[x,.625,z],.023,C.dark,18);
  tube(g,[side*spec.axle,.088,.209],[x,.23,.16],.011);
 }
 tube(g,[-.21,1.005,.505],[.21,1.005,.505],.023,C.dark,18,12);
 tube(g,[-spec.axle,.088,.209],[spec.axle,.088,.209],.012);
 tube(g,[-.20,.36,-.20],[.20,.36,-.20],.010);
 // Lower basket and the soft bag hanging on the parent side.
 softBox(g,.190,-.235,.215,.065,.205,.360,C.dark);piping(g,rounded(.190,-.235,.215,.065,.360),.005,[.16,.19,.18]);
 softBox(g,.150,.338,.448,.035,.525,.785,[.12,.15,.145]);
 tube(g,[-.15,.769,.454],[.15,.769,.454],.003,[.51,.54,.49],2,4);
 for(const x of [-.11,.11])tube(g,[x,.785,.402],[x,.96,.475],.007,C.dark,17,6);
 // Small wooden ring and bead preserve the original hanging accessory.
 tube(g,[.12,.60,.454],[.12,.36,.463],.0025,[.38,.28,.20],17,4);
 donut(g,.027,.0045,.0045,[.54,.36,.23],7,p=>[.12+p[1],.333+p[2],.463+p[0]],16,6);
 ellipsoid(g,[.12,.292,.463],[.012,.018,.012],[.79,.72,.57],7);
}
function wheel(g,r){
 donut(g,r,.025,.012,C.rubber);
 tube(g,[-.018,0,0],[.018,0,0],r-.022,[.15,.18,.18],18,32);
 for(const side of [-1,1]){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;tube(g,[side*.021,0,0],[side*.021,Math.cos(a)*(r-.029),Math.sin(a)*(r-.029)],.0033,C.rim,2,6);}
  tube(g,[side*.023,0,0],[side*.030,0,0],.013,[.56,.59,.56],2,12);
 }
}
function fork(g){
 tube(g,[0,.070,.018],[0,.145,0],.011);
 for(const x of [-.034,.034]){tube(g,[x,0,0],[x,.070,.018],.008,C.dark,18);tube(g,[x,.070,.018],[0,.070,.018],.008,C.dark,18);}
}
function finish(g){const data=new Float32Array(g.data);return {data,n:data.length/10,center:[0,.60,0],radius:1.1};}
function build(Geometry){const make=fn=>{const g=new Geometry();fn(g);return finish(g);};return {body:make(body),frontFork:make(fork),frontWheel:make(g=>wheel(g,spec.wheels[0].radius)),rearWheel:make(g=>wheel(g,spec.wheels[1].radius))};}
function wheelPose(wheel,side,steer,travel,rolling=true){const a=wheel.front?steer*.35:0,b=rolling?-travel/wheel.radius:0,c=Math.cos(a),s=Math.sin(a),p=Math.cos(b),q=Math.sin(b);return [c,0,s,0,-s*q,p,c*q,0,-s*p,-q,c*p,0,side*spec.axle,wheel.radius,wheel.z,1];}
const api={spec,build,wheelPose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkStroller=api;
})(typeof window!=='undefined'?window:globalThis);
