const esbuild = require('esbuild');
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
(async () => {
  const outfile = path.join(__dirname, 'shaders-4.0.4.js');
  const result = await esbuild.build({
    absWorkingDir: __dirname, entryPoints: ['entry.js'], outfile,
    bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2022',
    legalComments: 'eof', metafile: true,
    banner: {js:'/*! Shaders 4.0.4 | Copyright 2026 Shader Effects Inc. | MIT | See THIRD-PARTY-LICENSES.txt */'},
    plugins: [{name:'selected-shader-registry',setup(build){
      // 4.0.4 createShader imports core/registry.js. The renderer itself also
      // imports the hashed registry chunk; intercept both to remove unused effects.
      build.onResolve({filter:/(?:^|\/)(?:core\/registry|shaderRegistry-[^/]+)\.js$/},()=>({path:path.join(__dirname,'selected-registry.js')}));
    }}],
  });
  const bytes=fs.readFileSync(outfile);
  fs.writeFileSync(path.join(__dirname,'bundle-report.json'),JSON.stringify({
    shadersVersion:'4.0.4',esbuildVersion:'0.25.11',
    components:['Godrays','MeshGradient','LightLeak'],
    bytes:bytes.length,gzipBytes:zlib.gzipSync(bytes).length,
    exports:Object.values(result.metafile.outputs).find(output=>output.entryPoint)?.exports,
    source:'https://github.com/shader-effects-inc/shaders',
  },null,2));
  console.log(fs.readFileSync(path.join(__dirname,'bundle-report.json'),'utf8'));
})().catch(error=>{console.error(error);process.exit(1);});
