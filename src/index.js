import { Human } from 'https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.esm.js'; // equivalent of @vladmandic/human
import GLBench from 'https://cdn.jsdelivr.net/npm/@vladmandic/human/demo/helpers/gl-bench.js';

const workerJS = 'worker.js';
const processLog = document.querySelector("#log");

const config = {
  main: { // processes input and runs gesture analysis
    warmup: 'none',
    backend: 'wasm',
    modelBasePath: 'models',
    async: false,
    filter: { enabled: true },
    face: { enabled: true },
    object: { enabled: false },
    gesture: { enabled: false },
    hand: { enabled: false },
    body: { enabled: false },
    segmentation: { enabled: false },
  },
  face: { // runs all face models
    warmup: 'none',
    backend: 'wasm',
    modelBasePath: 'models',
    async: false,
    filter: { enabled: false },
    face: { enabled: true },
    object: { enabled: false },
    gesture: { enabled: false },
    hand: { enabled: false },
    body: { enabled: false },
    segmentation: { enabled: false },
  },
};

let human;
let canvas;
let video;
let bench;
let startDetection, endDetection;
let flagS=1, flagE=1;

const busy = {
  face: false,
};

const workers = {
  /** @type {Worker | null} */
  face: null,
};

const time = {
  main: 0,
  draw: 0,
  face: '[warmup]',
};

const start = {
  main: 0,
  draw: 0,
  face: 0,
};

const result = { // initialize empty result object which will be partially filled with results from each thread
  performance: {},
  hand: [],
  body: [],
  face: [],
  object: [],
};

function log(...msg) {
  const dt = new Date();
  const ts = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}.${dt.getMilliseconds().toString().padStart(3, '0')}`;
  console.log(ts, ...msg); // eslint-disable-line no-console
}

async function drawResults() {
  start.draw = human.now();
  const interpolated = human.next(result);
  await human.draw.all(canvas, interpolated);


  time.draw = Math.round(1 + human.now() - start.draw);
  const fps = Math.round(10 * 1000 / time.main) / 10;
  const draw = Math.round(10 * 1000 / time.draw) / 10;
  const div = document.querySelector('#log');
  if (div) div.innerText = `Human: version ${human.version} | Performance: Main ${time.main}ms Face: ${time.face}ms | FPS: ${fps} / ${draw}`;
  requestAnimationFrame(drawResults);
}

async function WriteEmotions(){
  const interpolated = human.next(result);

  let parent = document.querySelectorAll('#descript > p > span'); // Тут указывается целевой элемент
  let spanNode = Array.from(parent);
    spanNode.forEach((elem)=>elem.textContent='');

  const emotionArr = interpolated.face[0] ? (interpolated.face[0].emotion) : [];
  const len = emotionArr.length
  for (let i = 0; i < len; i++){
    document.querySelector(`#${emotionArr[i].emotion}`).textContent = `${(emotionArr[i].score*100).toFixed(0)}% `;
  }
}


async function receiveMessage(msg) {
  result[msg.data.type] = msg.data.result;
  busy[msg.data.type] = false;
  time[msg.data.type] = Math.round(human.now() - start[msg.data.type]);

  const face = msg.data.result;
  if (flagE && face[0] && (face[0].emotion)) {
    endDetection = performance.now();
    flagE = 0;
    console.log('Result perfomance between start and end = ', endDetection-startDetection);
  }
}

async function runDetection() {

  start.main = human.now();
  if (!bench) {
    bench = new GLBench(null, { trackGPU: false, chartHz: 20, chartLen: 20 });
    bench.begin('human');
  }

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  if (flagS) {
    startDetection = performance.now();
    flagS = 0;
  }

  if (!busy.face) {
    busy.face = true;
    start.face = human.now();
    if (workers.face) workers.face.postMessage({ image: imageData.data.buffer, width: canvas.width, 
                                                height: canvas.height, config: config.face, type: 'face' 
    }, [imageData.data.buffer.slice(0)]);
  }

  time.main = Math.round(human.now() - start.main);

  bench.nextFrame();
  requestAnimationFrame(runDetection);
}

async function setupCamera() {
  processLog.textContent = 'Подключение камеры...';
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');
  const output = document.getElementById('log');
  let stream;
  const constraints = {
    audio: false,
    video: {
      facingMode: 'user',
      resizeMode: 'crop-and-scale',
      width: 720,
      height:480,
    },
  };

  // enumerate devices for diag purposes
  navigator.mediaDevices.enumerateDevices()
    .then((devices) => log('enumerated devices:', devices))
    .catch(() => log('mediaDevices error'));
  log('camera constraints', constraints);

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (output) output.innerText += `\n${err.name}: ${err.message}`;
    log('camera error:', err);
  }
  if (stream) {
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    log('selected video source:', track, settings);
  } else {
    log('missing video stream');
  }
  const promise = !stream || new Promise((resolve) => {
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      resolve(true);
    };
  });
  // attach input to video element
  if (stream && video) video.srcObject = stream;
  return promise;
}

async function startWorkers() {
  if (!workers.face) workers.face = new Worker(workerJS);

  workers.face.onmessage = receiveMessage;
}

async function main() {
  // const adapter = await navigator.gpu.requestAdapter();
  // console.log('navigator.gpu = ',adapter);
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return;
  }

  human = new Human(config.main);
  const div = document.getElementById('log');
  if (div) div.innerText = `Human: version ${human.version}`;

  await startWorkers();
  await setupCamera();
  runDetection();
  drawResults();
  const interId = setInterval( WriteEmotions, 1000);
}

window.onload = main;
