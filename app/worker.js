<reference lib="webworker" />

self.importScripts('https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js'); 

let human;

onmessage = async (msg) => {

  if (!human) human = new Human.default(msg.data.config); 
  const image = new ImageData(new Uint8ClampedArray(msg.data.image), msg.data.width, msg.data.height);
  let result = {};
  result = await human.detect(image, msg.data.config);
  postMessage({ result: result[msg.data.type], type: msg.data.type });
};
