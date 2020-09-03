const fragmentShader = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec2 resolution;
uniform float time;

#define R           resolution
#define T           time
#define S           smoothstep
#define PI          3.1415926
#define MINDIST     .0001
#define MAXDIST     100.
#define r2(a) mat2(cos(a),sin(a),-sin(a),cos(a))


float easeInOutExpo(float t) {
    if (t == 0.0 || t == 1.0) return t;
    if ((t *= 2.0) < 1.0) {
        return 0.5 * pow(2.0, 10.0 * (t - 1.0));
    } else {
        return 0.5 * (-pow(2.0, -10.0 * (t - 1.0)) + 2.0);
    }
}

float linearstep(float begin, float end, float t) {
    return clamp((t - begin) / (end - begin), 0.0, 1.0);
}

float circle(vec2 pt, vec2 center, float r, float lw) {
  float len = length(pt - center),
        hlw = lw / 2.,
        edge = .01;
  return smoothstep(r-hlw-edge,r-hlw, len)-smoothstep(r+hlw,r+hlw+edge, len);
}

float sdBox(vec3 p, vec3 s) {
    p = abs(p)-s;
	  return length(max(p, 0.))+min(max(p.x, max(p.y, p.z)), 0.)-.05;
}
  
float orbit = .0,
      txx   = .0025,
      txa   = .0025,
      glw   = .0,
      zoom = 15.5; 
  
mat2 rotA,rotB,spin;
//@gaz Original Fractal Formula - Thank you!
//translated comments
//https://twigl.app/?ch=-MFu0X8wYxqxuhK4Cgd9&dm=graphics
float Scale;
vec3 map(vec3 p,float mgl){
  
    p.zy *=r2(T*.17);
  
  	p.zy-=-.3;
    p.yx *= rotA;
    p.xz *= rotB;
    vec3 res = vec3(100.,-1.,0.);

    float b = sdBox(p,vec3(2.5));
    if(b<res.x) res=vec3(b,2.,orbit);
    p=abs(p)-3.5;
    if(p.x<p.z)p.xz=p.zx;
    if(p.y<p.z)p.yz=p.zy;
    if(p.x<p.y)p.xy=p.yx;
	  float rate=-16.5,
          mr2=.25,
          off=1.37,
          s=.95;
  
    vec3  p0 = p;

    for (float i=0.; i<2.; i++){
        p=1.5-abs(p-1.);

        float g=clamp(mr2*max(1.05/dot(p,p),.8),0.,1.);

        p=p*rate*g+p0*off;
        s=s*abs(rate)*g+off;
      
        p.yz*=rotB;
        p.xz*=rotA;   
    }

    Scale = log2(s);
	  orbit=log2(s*.0091553);

    float d= length(p.xz)/s-.025;
    d= max(sdBox(p,vec3(5.))/s-.01,-d);
    if(d<res.x) res=vec3(d,1.,orbit);
 
    glw += .15/(.3+b*b);
    return res;
}

// distance estimator
vec3 marcher(vec3 ro, vec3 rd, int maxsteps) {
    float d = 0.,
          m = -1.,
          o = 0.;
    for(int i = 0; i<maxsteps; i++) {
        vec3 p = ro + rd * d;
        vec3 t = map(p,1.);
        if(t.x<MINDIST||d>MAXDIST) break;
        d += t.x*.5;
        m  = t.y;
        o  = t.z;
    }
    return vec3(d,m,o);
}

// Tetrahedron technique @iq
// https://www.iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
vec3 getNormal(vec3 p, float t){
    float e = (MINDIST + .0001) *t;
    vec2 h = vec2(1.,-1.)*.5773;
    return normalize( h.xyy*map( p + h.xyy*e ,0.).x + 
                      h.yyx*map( p + h.yyx*e ,0.).x + 
                      h.yxy*map( p + h.yxy*e ,0.).x + 
                      h.xxx*map( p + h.xxx*e ,0.).x );
}

//camera setup
vec3 camera(vec3 lp, vec3 ro, vec2 uv) {
    vec3 f=normalize(lp-ro),//camera forward
         r=normalize(cross(vec3(0,1,0),f)),//camera right
         u=normalize(cross(f,r)),//camera up
         c=ro+f*.95,//zoom
         i=c+uv.x*r+uv.y*u,//screen coords
        rd=i-ro;//ray direction
    return rd;
}

vec3 gethue(float a){return  .5 + .45*cos((4.5*a) - vec3(.25,1.5,2.15));}

vec3 getColor(float m, float o){
    vec3 h = gethue(o*.25);
    // use orbit number to band coloring
    if(o>4.     && o<5.1)   h=vec3(1.);
    if(o>6.     && o<6.1)   h=vec3(1.);
    if(o>7.15   && o<7.65)  h=vec3(1.);
    if(o>8.     && o<8.6)   h=vec3(1.);
    if(o>.0     && o<.5)    h=vec3(1.);
    if(o>-.1    && o<-.05)  h=vec3(1.);
    if(o>-2.2   && o<-1.75) h=vec3(1.);
    if(o>-3.8   && o<-2.75) h=vec3(1.);
    if(o>-6.    && o<-5.75) h=vec3(1.);
    if(o>-9.    && o<-8.75) h=vec3(1.);
    if(o>-8.5   && o<-7.75) h=vec3(1.);
    return h;
}

float ao(float j, vec3 p, vec3 n) {
    return clamp(map(p + n*j,0.).x/j, 0.,1.);   
}

void main(){
    // Precalculations to speed map and my
    // timing functions - this is new so be
    // kind. using Book of shader examples.
    // 
    float tm = mod(T*2.5, 32.);
    // move x steps in rotation
    float v1 = linearstep(0.0, 1.0, tm);
    float a1 = linearstep(2.0, 3.0, tm);
    
	  float v2 = linearstep(4.0, 5.0, tm);
    float a2 = linearstep(6.0, 7.0, tm);
    
    float v3 = linearstep(8.0, 9.0, tm);
    float a3 = linearstep(10.0, 11.0, tm);
    
    float v4 = linearstep(12.0, 13.0, tm);
    float a4 = linearstep(14.0, 15.0, tm);
    
    float v5 = linearstep(16.0, 17.0, tm);
    float a5 = linearstep(18.0, 19.0, tm);
    
	  float v6 = linearstep(20.0, 21.0, tm);
    float a6 = linearstep(22.0, 23.0, tm);
    
    float v7 = linearstep(24.0, 25.0, tm);
    float a7 = linearstep(26.0, 27.0, tm);
    
    float v8 = linearstep(28.0, 29.0, tm);
    float a8 = linearstep(30.0, 31.0, tm);
    
    float degs = mix(0., 360./8.,v1+v2+v3+v4+v5+v6+v7+v8);
    float degx = mix(0., 360./8.,a1+a2+a3+a4+a5+a6+a7+a8);
    
    // mix downs
    txa = degs;
    txx = degx;
    
    rotB = r2(degs*PI/180.);
    rotA = r2(degx*PI/180.);
    
    spin = r2(-T*.06);

    // Normalized pixel coordinates -1 to 1
    vec2 uv = (2.*gl_FragCoord.xy-R.xy)/R.y;
    vec3 C = vec3(0.);
	  vec3 FC = gethue(13.3);
    vec3 lp = vec3(0.,0.,0.),
         ro = vec3(0.,0.,zoom);

    vec3 rd = camera(lp, ro, uv);
    vec3 t = marcher(ro,rd, 256);
    
    float m = t.y;
    float o = t.z;
    // Standard shading procedures
    // yah dif - p and n - dif yah
    if(t.x<MAXDIST) {
        vec3 p = ro + rd * t.x,
             n = getNormal(p, t.x);
        vec3 light1 = vec3(0,25.,-15.0),
             light2 = vec3(0,25.,15.0);
        float dif  = clamp(dot(n,normalize(light1-p)),0. , 1.);
              dif += clamp(dot(n,normalize(light2-p)),0. , 1.);
        vec3 h = (m==1.) ? getColor(m,o) : FC;      
        C += dif* (ao (0.5,p,n) + ao(.05,p,n))*h*vec3(2.);
    } else {
        C += FC;
    }
    // Background - I enjoy the slight motion stuff
    vec2 dv = uv+vec2(T*.041,-T*.023);
    float cir = circle(fract(dv*12.),vec2(0.5),.34,.03);
    cir += circle(fract(dv*12.),vec2(0.5),.45,.06);
    vec3 cirx = mix(FC,gethue(14.3),cir);
    float dt = smoothstep(.2,.65,distance(uv,vec2(0.))*.75);
    cirx = mix(FC,cirx,dt*.25);
    // Fog / Blending
    C = mix( C, cirx, 1.-exp(-.000125*t.x*t.x*t.x));
    // add back glow
    // Output to screen
    //C *=vec3(texture(iChannel0,uv/.23).x);
    C += vec3(glw*.65)*FC;
    fragColor = vec4(pow(C, vec3(0.4545)),1.0);
}
`;

export default fragmentShader;
