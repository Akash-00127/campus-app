const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
function load(relative,mocks={}){const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:n=>{if(!(n in mocks))throw Error('Unexpected module evaluation: '+n);return typeof mocks[n]==='function'?mocks[n]():mocks[n]},console,Promise,Error});return module.exports}
function setup({go=true,os='android',configured=true,granted=true}={}){let loads=0,calls=[];const mocks={'react-native':{Platform:{OS:os}},expo:{isRunningInExpoGo:()=>go},'expo-constants':{expoConfig:{extra:{firebaseConfigured:configured}}},'expo-device':{isDevice:true},'./api':{request:async(...args)=>calls.push(args)},'expo-notifications':()=>{loads++;if(go)throw Error('Expo Go cannot evaluate notifications');return {setNotificationHandler:()=>{},setNotificationChannelAsync:async()=>{},AndroidImportance:{HIGH:4},requestPermissionsAsync:async()=>({status:granted?'granted':'denied'}),getDevicePushTokenAsync:async()=>({data:'native-test-token'}),addPushTokenListener:()=>({remove:()=>{}})}}};return {api:load('src/notifications.ts',mocks),loads:()=>loads,calls}}
test('importing account notification helper in Expo Go does not load native notifications',async()=>{const s=setup();assert.equal(s.loads(),0);assert.match(s.api.pushUnavailableReason(),/development build/);await assert.rejects(()=>s.api.enablePush('session'),/development build/);assert.equal(s.loads(),0)});
test('web and unconfigured builds never load the native push module',async()=>{for(const options of [{go:false,os:'web'},{go:false,configured:false}]){const s=setup(options);await assert.rejects(()=>s.api.enablePush('session'));assert.equal(s.loads(),0)}});
test('configured development build registers token and returns removable listener',async()=>{const s=setup({go:false});const listener=await s.api.enablePush('session');assert.equal(s.loads(),1);assert.equal(typeof listener.remove,'function');assert.equal(s.calls[0][0],'/notifications/devices');assert.equal(s.calls[0][3].token,'native-test-token')});
test('denied notification permission never registers token',async()=>{const s=setup({go:false,granted:false});await assert.rejects(()=>s.api.enablePush('session'),/permission/);assert.equal(s.calls.length,0)});
const {focusedScrollOffset}=load('src/keyboard.ts');
test('checkout helper imports without native crypto and produces distinct UUID keys when it is missing',()=>{
  let loads=0;
  const helper=load('src/checkout-key.ts',{'expo-crypto':()=>{loads++;throw Error("Cannot find native module 'ExpoCrypto'")}});
  assert.equal(loads,0);
  const keys=Array.from({length:1000},()=>helper.newCheckoutKey());
  assert.equal(new Set(keys).size,keys.length);
  for(const key of keys) assert.match(key,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('checkout helper uses native UUID generation when available',()=>{
  const helper=load('src/checkout-key.ts',{'expo-crypto':{randomUUID:()=> 'native-uuid'}});
  assert.equal(helper.newCheckoutKey(),'native-uuid');
});
test('keyboard covering a bottom field causes enough scrolling to reveal it',()=>{assert.equal(focusedScrollOffset(0,650,50,40,720,500),220)});
test('resized Android viewport keeps the focused field above its bottom',()=>{assert.equal(focusedScrollOffset(120,470,50,30,460,800),170)});
test('visible field retains scroll position; earlier fields can be revealed',()=>{assert.equal(focusedScrollOffset(90,100,50,30,400,500),90);assert.equal(focusedScrollOffset(90,10,40,30,400,500),58)});

function loadApi({os='android',host='10.141.173.51:8081',env={},fetchImpl=async()=>({ok:true,json:async()=>[]})}={}) {
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:n=>({'react-native':{Platform:{OS:os}},'expo-constants':{expoConfig:{hostUri:host}}})[n],__DEV__:true,process:{env},URL,AbortController,setTimeout,clearTimeout,fetch:fetchImpl,Error,TypeError});
  return module.exports;
}
test('native API follows the Expo LAN host when no override is set',()=>{
  assert.equal(loadApi().API_URL,'http://10.141.173.51:4000/v1');
  assert.equal(loadApi({host:'192.168.1.5:8081'}).API_URL,'http://192.168.1.5:4000/v1');
  assert.equal(loadApi({host:'',os:'ios'}).API_URL,'http://localhost:4000/v1');
});
test('explicit backend URLs are preserved and trailing slashes removed',()=>{
  assert.equal(loadApi({env:{EXPO_PUBLIC_API_URL:'https://api.example.com/v1/'}}).API_URL,'https://api.example.com/v1');
  assert.equal(loadApi({os:'web',env:{EXPO_PUBLIC_WEB_API_URL:'http://localhost:4000/v1'}}).API_URL,'http://localhost:4000/v1');
});
test('network and timeout errors identify the backend',async()=>{
  await assert.rejects(()=>loadApi({fetchImpl:async()=>{throw new TypeError('fetch failed')}}).universities(),/Cannot reach the backend at http:\/\/10.141.173.51:4000\/v1/);
  const api=loadApi({fetchImpl:(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
  await assert.rejects(()=>api.request('/health',undefined,'GET',undefined,1),/took too long/);
});

const registration = load('src/registration-flow.ts');
const validRegistration = {
  name: 'Asha Kumar', email: 'asha@example.edu', phone: '9876543210',
  universityId: 'university-1', campusId: 'campus-1', shopName: 'Campus Bakery',
  address: 'Block C, ground floor',
  password: 'strong-campus-password', otp: '123456',
};
test('registration catches invalid contact details before requesting verification',()=>{
  assert.match(registration.registrationError('account',{...validRegistration,email:'asha@'},false),/email/);
  assert.match(registration.registrationError('identity',{...validRegistration,name:'  '},true),/owner or manager/);
  assert.match(registration.registrationError('account',{...validRegistration,phone:'98765'},false),/10-digit/);
  assert.match(registration.registrationError('identity',{...validRegistration,campusId:''},false),/campus/);
});
test('registration stays short with only essential student and vendor steps',()=>{
  assert.deepEqual(Array.from(registration.registrationSteps(false)),['identity','campus','account','verify']);
  assert.deepEqual(Array.from(registration.registrationSteps(true)),['identity','campus','shop','account','verify']);
});
test('vendor registration requires useful shop details and pickup location',()=>{
  assert.match(registration.registrationError('shop',{...validRegistration,shopName:' '},true),/name/);
  assert.match(registration.registrationError('shop',{...validRegistration,address:' '},true),/pickup/);
  for(const vendor of [false,true]) for(const step of registration.registrationSteps(vendor)) {
    assert.equal(registration.registrationError(step,validRegistration,vendor),'');
  }
});
test('registration rejects short passwords and incomplete verification codes',()=>{
  assert.match(registration.registrationError('account',{...validRegistration,password:'short'},false),/8 characters/);
  assert.match(registration.registrationError('verify',{...validRegistration,otp:'12345'},false),/six-digit/);
});
