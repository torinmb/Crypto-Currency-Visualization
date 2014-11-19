var cellSize, columns, rows;
var container, stats;
var camera, controls, scene, renderer;
var pickingData = [], pickingTexture, pickingScene;
var objects = [];
var highlightBox;
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var geometry;
var drawnObject;
var noiseGen;

//Tiltshift
var cameraOrtho, sceneRenderTarget;
var clock = new THREE.Clock();
var uniformsNoise, uniformsNormal,
	heightMap, normalMap,
	quadTarget;

var animDelta = 0, animDeltaDir = -1;
var lightVal = 0, lightDir = 1;


var mouse = new THREE.Vector2();
var offset = new THREE.Vector3( 10, 10, 10 );

//Tiltshift

init();
animate();

function init() {

	container = document.getElementById( "container" );
	// SCENE (RENDER TARGET)

	sceneRenderTarget = new THREE.Scene();
	cameraOrtho = new THREE.OrthographicCamera( SCREEN_WIDTH / - 2, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT / - 2, -10000, 10000 );
	cameraOrtho.position.z = 100;
	sceneRenderTarget.add( cameraOrtho );

	//Scene Final
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 1000;


	controls = new THREE.TrackballControls( camera );
	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	controls.noZoom = false;
	controls.noPan = false;
	controls.staticMoving = true;
	controls.dynamicDampingFactor = 0.3;

	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x050505, 2000, 50000 );

	pickingScene = new THREE.Scene();
	pickingTexture = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight );
	pickingTexture.generateMipmaps = false;

	// LIGHTS

	scene.add( new THREE.AmbientLight( 0x111111 ) );

	directionalLight = new THREE.DirectionalLight( 0xffffff, 1.15 );
	directionalLight.position.set( 500, 2000, 0 );
	scene.add( directionalLight );

	pointLight = new THREE.PointLight( 0xff4400, 1.5 );
	pointLight.position.set( 0, 0, 0 );
	scene.add( pointLight );

	// HEIGHT + NORMAL MAPS

	var normalShader = THREE.NormalMapShader;

	var rx = 256, ry = 256;
	var pars = { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

	heightMap  = new THREE.WebGLRenderTarget( rx, ry, pars );
	heightMap.generateMipmaps = false;

	normalMap = new THREE.WebGLRenderTarget( rx, ry, pars );
	normalMap.generateMipmaps = false;

	uniformsNoise = {

		time:   { type: "f", value: 1.0 },
		scale:  { type: "v2", value: new THREE.Vector2( 1.5, 1.5 ) },
		offset: { type: "v2", value: new THREE.Vector2( 0, 0 ) }

	};

	uniformsNormal = THREE.UniformsUtils.clone( normalShader.uniforms );

	uniformsNormal.height.value = 0.05;
	uniformsNormal.resolution.value.set( rx, ry );
	uniformsNormal.heightMap.value = heightMap;

	var vertexShader = document.getElementById( 'vertexShader' ).textContent;
	//Custom box look
	var loader = new THREE.DDSLoader();
	var map1 = loader.load( 'textures/compressed/disturb_argb_mip.dds' );
	map1.minFilter = map1.magFilter = THREE.LinearFilter;
	map1.anisotropy = 4;
	var cubemap1 = loader.load( 'textures/compressed/Mountains_argb_mip.dds', function ( texture ) {
		texture.magFilter = THREE.LinearFilter;
		texture.minFilter = THREE.LinearMipmapLinearFilter;
		texture.mapping = new THREE.CubeReflectionMapping();

		// defaultMaterial.needsUpdate = true;
	} );


	geometry = new THREE.Geometry();
	geometry.dynamic = true;
	var pickingGeometry = new THREE.Geometry(),
	pickingMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } ),
	defaultMaterial = new THREE.MeshBasicMaterial( {envMap: cubemap1, vertexColors: THREE.VertexColors } );
	defaultMaterial.castShadow = true;
	defaultMaterial.receiveShadow = true;
	defaultMaterial.needsUpdate = true;
	function applyVertexColors( g, c ) {

		g.faces.forEach( function( f ) {

			var n = ( f instanceof THREE.Face3 ) ? 3 : 4;

			for( var j = 0; j < n; j ++ ) {

				f.vertexColors[ j ] = c;

			}

		} );

	}
	var color = new THREE.Color();

	var matrix = new THREE.Matrix4();
	var quaternion = new THREE.Quaternion();
	noiseGen = new ImprovedNoise();
	var test = new THREE.Geometry();
	var height =2;
	var width = 0;

	cellSize = 100;
	columns = 140;
	rows = 100;
	for ( var i = 0; i < columns; i ++ ) {
		for (var j = 0; j < rows; j++) {


			var add = Math.sqrt(i*i + j*j);
			var equation = noiseGen.noise(j* 0.02, j* 0.02, add * 0.02);
			height = Math.abs(2000 * equation);
			var geom = new THREE.BoxGeometry(cellSize, height , cellSize);
			geom.dynamic = true;
			// var geom = new THREE.CylinderGeometry( 0, cellSize, height, 3 );
			// geom.applyMatrix( new THREE.Matrix4().makeRotationFromEuler( new THREE.Euler( 0, 0, 0 ) ) );

			var position = new THREE.Vector3();
			position.x = (i * cellSize + cellSize / 2) - (columns * cellSize /2);
			position.y = height / 2;
			position.z = (j * cellSize + cellSize / 2) - (rows * cellSize /2);
			width = position.x + cellSize;
			
			var t = Math.PI * ((i + j) * 1.0) / (columns + rows);
			var u = 2 * Math.PI * ((i + j) * 1.0) / (columns + rows);
			var rotation = new THREE.Euler();
			// position.x = Math.sin(t)*Math.sin(u) *cellSize*20;
			// position.y = Math.sin(t) * Math.cos(u)* cellSize*20;
			// position.z = Math.cos(t)* cellSize*20;
			// rotation.x = position.x;
			// rotation.y = position.y;
			// rotation.z = position.z;
			// rotation.x = 20*Math.PI*(i)/(rows);
			// rotation.y = 20*Math.PI*(i)/(columns);
			// rotation.z = 20*Math.PI*(i+j)/(rows + columns);
			// rotation.x = 10*Math.PI*equation;
			// rotation.y = 10*Math.PI*equation;
			// rotation.z = 10*Math.PI*equation;
// 
			var scale = new THREE.Vector3();
			scale.x = 1;
			scale.y = 1;
			scale.z = 1;

			quaternion.setFromEuler( rotation, false );
			matrix.compose( position, quaternion, scale );

			// give the geom's vertices a random color, to be displayed

			// applyVertexColors( geom, color.setHex( Math.abs(height/800) * 0xffffff ) );
			var c = Math.abs(height/1500);
			applyVertexColors( geom, color.setHSL(c, 1, 1-c) );
			if(j == 1 && i == 1){test.merge(geom, matrix);}
			geometry.merge( geom, matrix );

			// give the geom's vertices a color corresponding to the "id"
			
			applyVertexColors( geom, color.setHex( i ) );

			pickingGeometry.merge( geom, matrix );

			pickingData[ i ] = {

				position: position,
				rotation: rotation
				// scale: scale

			};
		}

	}
	var testObj = new THREE.Mesh(test, defaultMaterial);
	scene.add(testObj);
	console.log("TEST");
	console.log(testObj.geometry.faces);
	console.log(testObj.geometry.faces.length);
	drawnObject = new THREE.Mesh( geometry, defaultMaterial );
	drawnObject.geometry.dynamic = true;
	scene.add( drawnObject );
	// geometry.position.set(width, 0, width);
	
	// var drawnObject2 = new THREE.Mesh( geometry, defaultMaterial );
	// scene.add( drawnObject2 );

	// pickingScene.add( new THREE.Mesh( pickingGeometry, pickingMaterial ) );

	highlightBox = new THREE.Mesh(
		new THREE.BoxGeometry( 1, 1, 1 ),
		new THREE.MeshLambertMaterial( { color: 0xffff00 }
	) );
	scene.add( highlightBox );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0xffffff, 1 );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.sortObjects = false;
	container.appendChild( renderer.domElement );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	container.appendChild( stats.domElement );

	renderer.domElement.addEventListener( 'mousemove', onMouseMove );
	document.addEventListener( 'keydown', onKeyDown, false );

	// COMPOSER

	renderer.autoClear = false;

	renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };

	renderTarget = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );
	renderTarget.generateMipmaps = false;

	effectBloom = new THREE.BloomPass( 0.6 );
	var effectBleach = new THREE.ShaderPass( THREE.BleachBypassShader );

	hblur = new THREE.ShaderPass( THREE.HorizontalTiltShiftShader );
	vblur = new THREE.ShaderPass( THREE.VerticalTiltShiftShader );

	var bluriness = 6;

	hblur.uniforms[ 'h' ].value = bluriness / SCREEN_WIDTH;
	vblur.uniforms[ 'v' ].value = bluriness / SCREEN_HEIGHT;

	hblur.uniforms[ 'r' ].value = vblur.uniforms[ 'r' ].value = 0.5;

	effectBleach.uniforms[ 'opacity' ].value = 0.65;

	composer = new THREE.EffectComposer( renderer, renderTarget );

	var renderModel = new THREE.RenderPass( scene, camera );

	vblur.renderToScreen = true;

	composer = new THREE.EffectComposer( renderer, renderTarget );

	composer.addPass( renderModel );

	composer.addPass( effectBloom );
	//composer.addPass( effectBleach );

	composer.addPass( hblur );
	composer.addPass( vblur );

}

function applyShader( shader, texture, target ) {

	var shaderMaterial = new THREE.ShaderMaterial( {

		fragmentShader: shader.fragmentShader,
		vertexShader: shader.vertexShader,
		uniforms: THREE.UniformsUtils.clone( shader.uniforms )

	} );

	shaderMaterial.uniforms[ "tDiffuse" ].value = texture;

	var sceneTmp = new THREE.Scene();

	var meshTmp = new THREE.Mesh( new THREE.PlaneGeometry( SCREEN_WIDTH, SCREEN_HEIGHT ), shaderMaterial );
	meshTmp.position.z = -500;

	sceneTmp.add( meshTmp );

	renderer.render( sceneTmp, cameraOrtho, target, true );

}
function onKeyDown ( event ) {

	switch( event.keyCode ) {

		case 78: /*N*/  lightDir *= -1; break;
		case 77: /*M*/  animDeltaDir *= -1; break;

	}

}

function onMouseMove( e ) {

	mouse.x = e.clientX;
	mouse.y = e.clientY;

}

function animate() {

	requestAnimationFrame( animate );

	render();
	stats.update();

}

function pick() {

	//render the picking scene off-screen

	renderer.render( pickingScene, camera, pickingTexture );

	var gl = self.renderer.getContext();

	//read the pixel under the mouse from the texture

	var pixelBuffer = new Uint8Array( 4 );
	gl.readPixels( mouse.x, pickingTexture.height - mouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer );

	//interpret the pixel as an ID

	var id = ( pixelBuffer[0] << 16 ) | ( pixelBuffer[1] << 8 ) | ( pixelBuffer[2] );
	var data = pickingData[ id ];

	if ( data) {

		//move our highlightBox so that it surrounds the picked object

		if ( data.position && data.rotation && data.scale ){

			highlightBox.position.copy( data.position );
			highlightBox.rotation.copy( data.rotation );
			highlightBox.scale.copy( data.scale ).add( offset );
			highlightBox.visible = true;
		}

	} else {

		highlightBox.visible = false;

	}

}

function render() {
	var delta = clock.getDelta();
	controls.update();
	var time = Date.now() * 0.0001;

	pick();


	var fLow = 0.1, fHigh = 0.8;

	lightVal = THREE.Math.clamp( lightVal + 0.5 * delta * lightDir, fLow, fHigh );

	var valNorm = ( lightVal - fLow ) / ( fHigh - fLow );

	scene.fog.color.setHSL( 0.1, 0.5, lightVal );

	renderer.setClearColor( scene.fog.color, 1 );

	directionalLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.1, 1.15 );
	pointLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.9, 1.5 );
	var color = new THREE.Color();
	var index = 0;
	if (animDeltaDir != -1){
		// for ( var i = 0; i < columns; i ++ ) {
			// for (var j = 0; j < rows; j++) {

				// var add = Math.sqrt(i*i + j*j);
				var equation = 0;
				iter = 0;
				for (var i = 0; i < drawnObject.geometry.vertices.length -5; i+=8) {

						var t = ((1.0 * i)/drawnObject.geometry.vertices.length) * 140;
						
					var length = Math.sqrt((iter % 100) * (iter % 100) + iter * iter);
					equation = noiseGen.noise(iter * 0.02 + time, (iter % 100) * 0.02 + time, length * 0.02 + time);
					var height = Math.abs(2000 * equation);
					drawnObject.geometry.vertices[i].y = height;
					drawnObject.geometry.vertices[i+1].y= height;
					drawnObject.geometry.vertices[i+4].y= height;
					drawnObject.geometry.vertices[i+5].y= height;
					
					drawnObject.geometry.vertices[i+2].y= -height;
					drawnObject.geometry.vertices[i+3].y= -height;
					drawnObject.geometry.vertices[i+6].y= -height;
					drawnObject.geometry.vertices[i+7].y= -height;
					
					// var col = Math.abs(height/1500);
					// var c = color.setHSL(col, 1, 1-col);
					// for (var j = 0; j < 12; j++){
					// 	var f = drawnObject.geometry.faces[j + iter*12];
					// 	var n = ( f instanceof THREE.Face3 ) ? 3 : 4;
					// 	for( var k = 0; k < n; k ++ ) {
					// 		f.vertexColors[ k ] = c;
					// 	}
					// }
					iter +=1;
				}
		drawnObject.geometry.verticesNeedUpdate = true;
		console.log(drawnObject.geometry.vertices.length);
		console.log(drawnObject.geometry.faces.length);
	}

	composer.render( 0.1 );
	// renderer.render( scene, camera );

}