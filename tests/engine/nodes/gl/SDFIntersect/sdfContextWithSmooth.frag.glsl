precision highp float;
precision highp int;
uniform int MAX_STEPS;
uniform float MAX_DIST;
uniform float SURF_DIST;
uniform float NORMALS_BIAS;
uniform vec3 CENTER;
#define ZERO 0
uniform float debugMinSteps;
uniform float debugMaxSteps;
uniform float debugMinDepth;
uniform float debugMaxDepth;
#include <common>
vec4 quatSlerp(vec4 q1, vec4 q2, float t){
	float angle = acos(dot(q1, q2));
	float denom = sin(angle);
	return (q1*sin((1.0-t)*angle)+q2*sin(t*angle))/denom;
}
vec4 quatMult(vec4 q1, vec4 q2)
{
	return vec4(
	q1.w * q2.x + q1.x * q2.w + q1.z * q2.y - q1.y * q2.z,
	q1.w * q2.y + q1.y * q2.w + q1.x * q2.z - q1.z * q2.x,
	q1.w * q2.z + q1.z * q2.w + q1.y * q2.x - q1.x * q2.y,
	q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
	);
}
mat4 rotationMatrix(vec3 axis, float angle)
{
	axis = normalize(axis);
	float s = sin(angle);
	float c = cos(angle);
	float oc = 1.0 - c;
 	return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s, 0.0, oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,  0.0, oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c, 0.0, 0.0, 0.0, 0.0, 1.0);
}
vec4 quatFromAxisAngle(vec3 axis, float angle)
{
	vec4 qr;
	float half_angle = (angle * 0.5);	float sin_half_angle = sin(half_angle);
	qr.x = axis.x * sin_half_angle;
	qr.y = axis.y * sin_half_angle;
	qr.z = axis.z * sin_half_angle;
	qr.w = cos(half_angle);
	return qr;
}
vec3 rotateWithAxisAngle(vec3 position, vec3 axis, float angle)
{
	vec4 q = quatFromAxisAngle(axis, angle);
	vec3 v = position.xyz;
	return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}
vec3 rotateWithQuat( vec3 v, vec4 q )
{
	return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}
float vectorAngle(vec3 start, vec3 dest){
	start = normalize(start);
	dest = normalize(dest);
	float cosTheta = dot(start, dest);
	vec3 c1 = cross(start, dest);
	vec3 y_axis = vec3(0.0, 1.0, 0.0);
	float d1 = dot(c1, y_axis);
	float angle = acos(cosTheta) * sign(d1);
	return angle;
}
vec4 vectorAlign(vec3 start, vec3 dest){
	start = normalize(start);
	dest = normalize(dest);
	float cosTheta = dot(start, dest);
	vec3 axis;
	if(cosTheta > (1.0 - 0.0001) || cosTheta < (-1.0 + 0.0001) ){
		axis = normalize(cross(start, vec3(0.0, 1.0, 0.0)));
		if (length(axis) < 0.001 ){			axis = normalize(cross(start, vec3(1.0, 0.0, 0.0)));
		}
	} else {
		axis = normalize(cross(start, dest));
	}
	float angle = acos(cosTheta);
	return quatFromAxisAngle(axis, angle);
}
vec4 vectorAlignWithUp(vec3 start, vec3 dest, vec3 up){
	vec4 rot1 = vectorAlign(start, dest);
	up = normalize(up);
	vec3 newUp = rotateWithQuat(vec3(0.0, 1.0, 0.0), rot1);	vec4 rot2 = vectorAlign(up, newUp);
	return rot2;
}
float quatToAngle(vec4 q){
	return 2.0 * acos(q.w);
}
vec3 quatToAxis(vec4 q){
	return vec3(
		q.x / sqrt(1.0-q.w*q.w),
		q.y / sqrt(1.0-q.w*q.w),
		q.z / sqrt(1.0-q.w*q.w)
	);
}
vec4 align(vec3 dir, vec3 up){
	vec3 start_dir = vec3(0.0, 0.0, 1.0);
	vec3 start_up = vec3(0.0, 1.0, 0.0);
	vec4 rot1 = vectorAlign(start_dir, dir);
	up = normalize(up);
	vec3 right = normalize(cross(dir, up));
	if(length(right)<0.001){
		right = vec3(1.0, 0.0, 0.0);
	}
	up = normalize(cross(right, dir));
	vec3 newUp = rotateWithQuat(start_up, rot1);	vec4 rot2 = vectorAlign(normalize(newUp), up);
	return quatMult(rot1, rot2);
}
mat4 translate( vec3 t )
{
    return mat4( 1.0, 0.0, 0.0, 0.0,
				 0.0, 1.0, 0.0, 0.0,
				 0.0, 0.0, 1.0, 0.0,
				 t.x,   t.y,   t.z,   1.0 );
}
vec3 SDFTransform( in vec3 p, vec3 t, vec3 rot )
{	
	mat4 rotx = rotationMatrix( normalize(vec3(1.0,0.0,0.0)), rot.x );
	mat4 roty = rotationMatrix( normalize(vec3(0.0,1.0,0.0)), rot.y );
	mat4 rotz = rotationMatrix( normalize(vec3(0.0,0.0,1.0)), rot.z );
	mat4 tra = translate( t );
	mat4 mat = tra * rotx * roty * rotz; 
	mat4 matInverse = inverse( mat );
	return (matInverse * vec4(p, 1.)).xyz;
}
float dot2( in vec2 v ) { return dot(v,v); }
float dot2( in vec3 v ) { return dot(v,v); }
float ndot( in vec2 a, in vec2 b ) { return a.x*b.x - a.y*b.y; }
float sdSphere( vec3 p, float s )
{
	return length(p)-s;
}
float sdBox( vec3 p, vec3 b )
{
	vec3 q = abs(p) - b*0.5;
	return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float sdRoundBox( vec3 p, vec3 b, float r )
{
	vec3 q = abs(p) - b*0.5;
	return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}
float sdBoxFrame( vec3 p, vec3 b, float e )
{
		p = abs(p  )-b*0.5;
	vec3 q = abs(p+e)-e;
	return min(min(
		length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
		length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
		length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}
float sdCapsule( vec3 p, vec3 a, vec3 b, float r )
{
	vec3 pa = p - a, ba = b - a;
	float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
	return length( pa - ba*h ) - r;
}
float sdVerticalCapsule( vec3 p, float h, float r )
{
	p.y -= clamp( p.y, 0.0, h );
	return length( p ) - r;
}
float sdCone( in vec3 p, in vec2 c, float h )
{
	vec2 q = h*vec2(c.x/c.y,-1.0);
	vec2 w = vec2( length(p.xz), p.y );
	vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
	vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
	float k = sign( q.y );
	float d = min(dot( a, a ),dot(b, b));
	float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
	return sqrt(d)*sign(s);
}
float sdConeWrapped(vec3 pos, float angle, float height){
	return sdCone(pos, vec2(sin(angle), cos(angle)), height);
}
float sdRoundCone( vec3 p, float r1, float r2, float h )
{
	float b = (r1-r2)/h;
	float a = sqrt(1.0-b*b);
	vec2 q = vec2( length(p.xz), p.y );
	float k = dot(q,vec2(-b,a));
	if( k<0.0 ) return length(q) - r1;
	if( k>a*h ) return length(q-vec2(0.0,h)) - r2;
	return dot(q, vec2(a,b) ) - r1;
}
float sdPlane( vec3 p, vec3 n, float h )
{
	return dot(p,n) + h;
}
float sdTorus( vec3 p, vec2 t )
{
	vec2 q = vec2(length(p.xz)-t.x,p.y);
	return length(q)-t.y;
}
float sdCappedTorus(in vec3 p, in vec2 sc, in float ra, in float rb)
{
	p.x = abs(p.x);
	float k = (sc.y*p.x>sc.x*p.y) ? dot(p.xy,sc) : length(p.xy);
	return sqrt( dot(p,p) + ra*ra - 2.0*ra*k ) - rb;
}
float sdLink( vec3 p, float le, float r1, float r2 )
{
  vec3 q = vec3( p.x, max(abs(p.y)-le,0.0), p.z );
  return length(vec2(length(q.xy)-r1,q.z)) - r2;
}
float sdSolidAngle(vec3 pos, vec2 c, float radius)
{
	vec2 p = vec2( length(pos.xz), pos.y );
	float l = length(p) - radius;
	float m = length(p - c*clamp(dot(p,c),0.0,radius) );
	return max(l,m*sign(c.y*p.x-c.x*p.y));
}
float sdSolidAngleWrapped(vec3 pos, float angle, float radius){
	return sdSolidAngle(pos, vec2(sin(angle), cos(angle)), radius);
}
float sdOctahedron( vec3 p, float s)
{
  p = abs(p);
  float m = p.x+p.y+p.z-s;
  vec3 q;
       if( 3.0*p.x < m ) q = p.xyz;
  else if( 3.0*p.y < m ) q = p.yzx;
  else if( 3.0*p.z < m ) q = p.zxy;
  else return m*0.57735027;
    
  float k = clamp(0.5*(q.z-q.y+s),0.0,s); 
  return length(vec3(q.x,q.y-s+k,q.z-k)); 
}
float SDFUnion( float d1, float d2 ) { return min(d1,d2); }
float SDFSubtract( float d1, float d2 ) { return max(-d1,d2); }
float SDFIntersect( float d1, float d2 ) { return max(d1,d2); }
float SDFSmoothUnion( float d1, float d2, float k ) {
	float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
	return mix( d2, d1, h ) - k*h*(1.0-h);
}
float SDFSmoothSubtract( float d1, float d2, float k ) {
	float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
	return mix( d2, -d1, h ) + k*h*(1.0-h);
}
float SDFSmoothIntersect( float d1, float d2, float k ) {
	float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
	return mix( d2, d1, h ) + k*h*(1.0-h);
}
vec4 SDFElongateFast( in vec3 p, in vec3 h )
{
	return vec4( p-clamp(p,-h,h), 0.0 );
}
vec4 SDFElongateSlow( in vec3 p, in vec3 h )
{
	vec3 q = abs(p)-h;
	return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
}
float SDFOnion( in float sdf, in float thickness )
{
	return abs(sdf)-thickness;
}
#include <packing>
#include <lightmap_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
varying vec3 vPw;
#if NUM_SPOT_LIGHTS > 0
	struct SpotLightRayMarching {
		vec3 worldPos;
		vec3 direction;
		float penumbra;
	};
	uniform SpotLightRayMarching spotLightsRayMarching[ NUM_SPOT_LIGHTS ];
	#if NUM_SPOT_LIGHT_COORDS > 0
		uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	#endif
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLightRayMarching {
		vec3 direction;
		float penumbra;
	};
	uniform DirectionalLightRayMarching directionalLightsRayMarching[ NUM_DIR_LIGHTS ];
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLightRayMarching {
		vec3 direction;
	};
	uniform HemisphereLightRayMarching hemisphereLightsRayMarching[ NUM_HEMI_LIGHTS ];
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLightRayMarching {
		vec3 worldPos;
		float penumbra;
	};
	uniform PointLightRayMarching pointLightsRayMarching[ NUM_POINT_LIGHTS ];
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif
struct SDFContext {
	float d;
	int stepsCount;
	int matId;
	int matId2;
	float matBlend;
};
SDFContext DefaultSDFContext(){
	return SDFContext( 0., 0, 0, 0, 0. );
}
int DefaultSDFMaterial(){
	return 0;
}
SDFContext GetDist(vec3 p) {
	SDFContext sdfContext = SDFContext(0., 0, 0, 0, 0.);
	vec3 v_POLY_SDFTransform1_p = SDFTransform(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0));
	
	float v_POLY_SDFSphere2_float = sdSphere(p - vec3(0.0, 0.0, 0.0), 1.0);
	
	float v_POLY_SDFSphere1_float = sdSphere(v_POLY_SDFTransform1_p - vec3(0.0, 0.0, 0.0), 1.0);
	
	SDFContext v_POLY_SDFContext2_SDFContext = SDFContext(v_POLY_SDFSphere2_float, 0, -1, -1, 0.);
	
	SDFContext v_POLY_SDFContext1_SDFContext = SDFContext(v_POLY_SDFSphere1_float, 0, -1, -1, 0.);
	
	bool v_POLY_SDFIntersect1_side = v_POLY_SDFContext1_SDFContext.d < v_POLY_SDFContext2_SDFContext.d;
	int v_POLY_SDFIntersect1_matId = v_POLY_SDFIntersect1_side ? v_POLY_SDFContext1_SDFContext.matId : v_POLY_SDFContext2_SDFContext.matId;
	int v_POLY_SDFIntersect1_matId2 = v_POLY_SDFIntersect1_side ? v_POLY_SDFContext2_SDFContext.matId : v_POLY_SDFContext1_SDFContext.matId;
	float v_POLY_SDFIntersect1_dist = v_POLY_SDFContext1_SDFContext.d - v_POLY_SDFContext2_SDFContext.d;
	float v_POLY_SDFIntersect1_halfBlendDist = 0.2 * 0.5;
	float v_POLY_SDFIntersect1_matBlend = smoothstep(-v_POLY_SDFIntersect1_halfBlendDist,v_POLY_SDFIntersect1_halfBlendDist, v_POLY_SDFIntersect1_dist);
	v_POLY_SDFIntersect1_matBlend = v_POLY_SDFIntersect1_dist > 0. ? 1.0-v_POLY_SDFIntersect1_matBlend : v_POLY_SDFIntersect1_matBlend;
	float v_POLY_SDFIntersect1_d = SDFSmoothIntersect(v_POLY_SDFContext1_SDFContext.d, v_POLY_SDFContext2_SDFContext.d, 0.4);
	SDFContext v_POLY_SDFIntersect1_intersect = SDFContext(v_POLY_SDFIntersect1_d, 0, v_POLY_SDFIntersect1_matId, v_POLY_SDFIntersect1_matId2, v_POLY_SDFIntersect1_matBlend);
	
	sdfContext = v_POLY_SDFIntersect1_intersect;
	
	return sdfContext;
}
SDFContext RayMarch(vec3 ro, vec3 rd, float side) {
	SDFContext dO = SDFContext(0.,0,0,0,0.);
	#pragma unroll_loop_start
	for(int i=0; i<MAX_STEPS; i++) {
		vec3 p = ro + rd*dO.d;
		SDFContext sdfContext = GetDist(p);
		dO.d += sdfContext.d * side;
		#if defined( DEBUG_STEPS_COUNT )
			dO.stepsCount += 1;
		#endif
		dO.matId = sdfContext.matId;
		dO.matId2 = sdfContext.matId2;
		dO.matBlend = sdfContext.matBlend;
		if(dO.d>MAX_DIST || abs(sdfContext.d)<SURF_DIST) break;
	}
	#pragma unroll_loop_end
	return dO;
}
vec3 GetNormal(vec3 p) {
	SDFContext sdfContext = GetDist(p);
	vec2 e = vec2(NORMALS_BIAS, 0);
	vec3 n = sdfContext.d - vec3(
		GetDist(p-e.xyy).d,
		GetDist(p-e.yxy).d,
		GetDist(p-e.yyx).d);
	return normalize(n);
}
float calcSoftshadow( in vec3 ro, in vec3 rd, float mint, float maxt, float k )
{
	float res = 1.0;
	float ph = 1e20;
	for( float t=mint; t<maxt; )
	{
		float h = GetDist(ro + rd*t).d;
		if( h<0.001 )
			return 0.0;
		float y = h*h/(2.0*ph);
		float d = sqrt(h*h-y*y);
		res = min( res, k*d/max(0.0,t-y) );
		ph = h;
		t += h;
	}
	return res;
}
vec3 GetLight(vec3 p, vec3 n) {
	vec3 dif = vec3(0.,0.,0.);
	#if NUM_SPOT_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_HEMI_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_RECT_AREA_LIGHTS > 0
		GeometricContext geometry;
		geometry.position = p;
		geometry.normal = n;
		IncidentLight directLight;
		ReflectedLight reflectedLight;
		vec3 lightPos, lightDir, l;
		vec3 lighDif;
		SDFContext sdfContext;
		#if NUM_SPOT_LIGHTS > 0
			SpotLightRayMarching spotLightRayMarching;
			SpotLight spotLight;
			#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
				SpotLightShadow spotLightShadow;
			#endif
			#pragma unroll_loop_start
			for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
				spotLightRayMarching = spotLightsRayMarching[ i ];
				spotLight = spotLights[ i ];
				spotLight.position = spotLightRayMarching.worldPos;
				spotLight.direction = spotLightRayMarching.direction;
				getSpotLightInfo( spotLight, geometry, directLight );
				
				lightPos = spotLightRayMarching.worldPos;
				
				#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
					spotLightShadow = spotLightShadows[ i ];
					vec4 spotLightShadowCoord = spotLightMatrix[ i ] * vec4(p, 1.0);
					directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, spotLightShadowCoord ) : 1.0;
				#endif
				l = normalize(lightPos-p);
				lighDif = directLight.color * clamp(dot(n, l), 0., 1.) * calcSoftshadow(p, l, 10.*SURF_DIST, distance(p,lightPos), 1./max(spotLightRayMarching.penumbra*0.2,0.001));
				
				dif += lighDif;
			}
			#pragma unroll_loop_end
		#endif
		#if NUM_DIR_LIGHTS > 0
			DirectionalLightRayMarching directionalLightRayMarching;
			DirectionalLight directionalLight;
			#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
				DirectionalLightShadow directionalLightShadow;
			#endif
			#pragma unroll_loop_start
			for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
				directionalLightRayMarching = directionalLightsRayMarching[ i ];
				directionalLight = directionalLights[ i ];
				lightDir = directionalLightRayMarching.direction;
				getDirectionalLightInfo( directionalLight, geometry, directLight );
				#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
					directionalLightShadow = directionalLightShadows[ i ];
					vec4 dirLightShadowCoord = directionalShadowMatrix[ i ] * vec4(p, 1.0);
					directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, dirLightShadowCoord ) : 1.0;
				#endif
				l = lightDir;
				lighDif = directLight.color * clamp(dot(n, l), 0., 1.) * calcSoftshadow(p, l, 10.*SURF_DIST, distance(p,lightPos), 1./max(directionalLightRayMarching.penumbra*0.2,0.001));
				dif += lighDif;
			}
			#pragma unroll_loop_end
		#endif
		
		#if ( NUM_HEMI_LIGHTS > 0 )
			#pragma unroll_loop_start
			HemisphereLight hemiLight;
			for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
				hemiLight.skyColor = hemisphereLights[ i ].skyColor;
				hemiLight.groundColor = hemisphereLights[ i ].groundColor;
				hemiLight.direction = hemisphereLightsRayMarching[ i ].direction;
				dif += getHemisphereLightIrradiance( hemiLight, n );
			}
			#pragma unroll_loop_end
		#endif
		#if NUM_POINT_LIGHTS > 0
			PointLightRayMarching pointLightRayMarching;
			PointLight pointLight;
			#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
				PointLightShadow pointLightShadow;
			#endif
			#pragma unroll_loop_start
			for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
				pointLightRayMarching = pointLightsRayMarching[ i ];
				pointLight = pointLights[ i ];
				pointLight.position = pointLightRayMarching.worldPos;
				getPointLightInfo( pointLight, geometry, directLight );
				#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
					pointLightShadow = pointLightShadows[ i ];
					vec4 pointLightShadowCoord = pointShadowMatrix[ i ] * vec4(p, 1.0);
					directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, pointLightShadowCoord, pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
				#endif
				
				lightPos = pointLightRayMarching.worldPos;
				l = normalize(lightPos-p);
				lighDif = directLight.color * clamp(dot(n, l), 0., 1.) * calcSoftshadow(p, l, 10.*SURF_DIST, distance(p,lightPos), 1./max(pointLightRayMarching.penumbra*0.2,0.001));
				dif += lighDif;
			}
			#pragma unroll_loop_end
		#endif
				
	#endif
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	dif += irradiance;
	return dif;
}
vec3 applyMaterialWithoutRefraction(vec3 p, vec3 n, vec3 rayDir, int mat){
	vec3 col = vec3(1.);
	
	return col;
}
vec3 applyMaterialWithoutReflection(vec3 p, vec3 n, vec3 rayDir, int mat){
	vec3 col = vec3(1.);
	
	return col;
}
#ifdef RAYMARCHED_REFLECTIONS
vec3 GetReflection(vec3 p, vec3 n, vec3 rayDir, float biasMult, sampler2D envMap, int reflectionDepth){
	bool hitReflection = true;
	vec3 reflectedColor = vec3(0.);
	#pragma unroll_loop_start
	for(int i=0; i < reflectionDepth; i++) {
		if(hitReflection){
			rayDir = reflect(rayDir, n);
			p += n*SURF_DIST*biasMult;
			SDFContext sdfContext = RayMarch(p, rayDir, 1.);
			if( sdfContext.d >= MAX_DIST){
				hitReflection = false;
				reflectedColor = envMapSample(rayDir, envMap);
			}
			if(hitReflection){
				p += rayDir * sdfContext.d;
				n = GetNormal(p);
				vec3 matCol = applyMaterialWithoutReflection(p, n, rayDir, sdfContext.matId);
				reflectedColor += matCol;
			}
		}
	}
	#pragma unroll_loop_end
	return reflectedColor;
}
#endif
#ifdef RAYMARCHED_REFRACTIONS
vec4 GetRefractedData(vec3 p, vec3 n, vec3 rayDir, float ior, float biasMult, sampler2D envMap, float refractionMaxDist, int refractionDepth){
	bool hitRefraction = true;
	bool changeSide = true;
	#ifdef RAYMARCHED_REFRACTIONS_START_OUTSIDE_MEDIUM
	float side = -1.;
	#else
	float side =  1.;
	#endif
	float iorInverted = 1. / ior;
	vec3 refractedColor = vec3(0.);
	float distanceInsideMedium=0.;
	float totalRefractedDistance=0.;
	#pragma unroll_loop_start
	for(int i=0; i < refractionDepth; i++) {
		if(hitRefraction){
			float currentIor = side<0. ? iorInverted : ior;
			vec3 rayDirPreRefract = rayDir;
			rayDir = refract(rayDir, n, currentIor);
			changeSide = dot(rayDir, rayDir)!=0.;
			if(changeSide == true) {
				p -= n*SURF_DIST*(2.+biasMult);
			} else {
				p += n*SURF_DIST*(   biasMult);
				rayDir = reflect(rayDirPreRefract, n);
			}
			SDFContext sdfContext = RayMarch(p, rayDir, side);
			totalRefractedDistance += sdfContext.d;
			if( abs(sdfContext.d) >= MAX_DIST || totalRefractedDistance > refractionMaxDist ){
				hitRefraction = false;
				refractedColor = envMapSample(rayDir, envMap);
			}
			if(hitRefraction){
				p += rayDir * sdfContext.d;
				n = GetNormal(p) * side;
				vec3 matCol = applyMaterialWithoutRefraction(p, n, rayDir, sdfContext.matId);
				refractedColor = matCol;
				distanceInsideMedium += (side-1.)*-0.5*abs(sdfContext.d);
				if( changeSide ){
					side *= -1.;
				}
			}
		}
		#ifdef RAYMARCHED_REFRACTIONS_SAMPLE_ENV_MAP_ON_LAST
		if(i == refractionDepth-1){
			refractedColor = envMapSample(rayDir, envMap);
		}
		#endif
	}
	#pragma unroll_loop_end
	return vec4(refractedColor, distanceInsideMedium);
}
float applyRefractionAbsorption(float refractedDataColor, float tint, float distanceInsideMedium, float absorption){
	float blend = smoothstep(0.,1.,absorption*distanceInsideMedium);
	return mix(refractedDataColor, refractedDataColor*tint, blend);
}
vec3 applyRefractionAbsorption(vec3 refractedDataColor, vec3 tint, float distanceInsideMedium, float absorption){
	float blend = smoothstep(0.,1.,absorption*distanceInsideMedium);
	return vec3(
		mix(refractedDataColor.r, refractedDataColor.r*tint.r, blend),
		mix(refractedDataColor.g, refractedDataColor.g*tint.g, blend),
		mix(refractedDataColor.b, refractedDataColor.b*tint.b, blend)
	);
}
#endif
vec3 applyMaterial(vec3 p, vec3 n, vec3 rayDir, int mat){
	vec3 col = vec3(0.);
	
	return col;
}
vec4 applyShading(vec3 rayOrigin, vec3 rayDir, SDFContext sdfContext){
	vec3 p = rayOrigin + rayDir * sdfContext.d;
	vec3 n = GetNormal(p);
	
	vec3 col = applyMaterial(p, n, rayDir, sdfContext.matId);
	if(sdfContext.matBlend > 0.) {
		vec3 col2 = applyMaterial(p, n, rayDir, sdfContext.matId2);
		col = (1. - sdfContext.matBlend)*col + sdfContext.matBlend*col2;
	}
		
	col = pow( col, vec3(0.4545) ); 
	return vec4(col, 1.);
}
void main()	{
	vec3 rayDir = normalize(vPw - cameraPosition);
	vec3 rayOrigin = cameraPosition - CENTER;
	SDFContext sdfContext = RayMarch(rayOrigin, rayDir, 1.);
	gl_FragColor = vec4(0.);
	if( sdfContext.d >= MAX_DIST ){ discard; }
	#if defined( DEBUG_STEPS_COUNT )
		float normalizedStepsCount = (float(sdfContext.stepsCount) - debugMinSteps ) / ( debugMaxSteps - debugMinSteps );
		gl_FragColor = vec4(normalizedStepsCount, 1.-normalizedStepsCount, 0., 1.);
		return;
	#endif
	#if defined( DEBUG_DEPTH )
		float normalizedDepth = 1.-(sdfContext.d - debugMinDepth ) / ( debugMaxDepth - debugMinDepth );
		normalizedDepth = saturate(normalizedDepth);		gl_FragColor = vec4(normalizedDepth);
		return;
	#endif
	gl_FragColor = applyShading(rayOrigin, rayDir, sdfContext);
}