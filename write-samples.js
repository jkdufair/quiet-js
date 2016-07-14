
import fs from "fs";

const samples = require("./workingsamples.json");
let length = 0;

samples.forEach((frames) => {
  length += frames.length * 4;
});

const buf = Buffer.alloc(length * 4);
let idx = 0;

samples.forEach((frames) => {
  frames.forEach((float) => {
    buf.writeFloatLE(float, idx * 4);
    idx += 1;
  });
});

fs.writeFileSync("working.pcm", buf);
