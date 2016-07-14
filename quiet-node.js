
import fs from "fs";

const profile = {
    "checksum_scheme": "crc32",
    "inner_fec_scheme": "v27",
    "outer_fec_scheme": "none",
    "mod_scheme": "psk2",
    "frame_length": 25,
    "modulation": {
        "center_frequency": 4200,
        "gain": 0.15
    },
    "interpolation": {
        "samples_per_symbol": 10,
        "symbol_delay": 4,
        "excess_bandwidth": 0.35
    },
    "encoder_filters": {
        "dc_filter_alpha": 0.01
    },
    "resampler": {
        "delay": 13,
        "bandwidth": 0.45,
        "attenuation": 60,
        "filter_bank_size": 64
    }
};

const omgwtf = function(filename) {
  const stuff = fs.readFileSync("./quiet-emscripten.js", "utf8");
  return eval(stuff);
};

// omgwtf("./quiet-emscripten.js");
// omgwtf("./libfec.js");
// console.log(omgwtf("./libfec.js"));


const Module = require("./quiet-emscripten");
Module.Runtime.loadDynamicLibrary("./libfec.js");

const SAMPLE_RATE = 44100;
const SAMPLE_BUFFER_SIZE = 16384;
const FRAME_BUFFER_SIZE = Math.pow(2, 14);

class Receiver {
  constructor(profile) {
    const c_profiles = Module.intArrayFromString(JSON.stringify({"profile": profile}));
    const c_profile = Module.intArrayFromString("profile");
    const opt = Module.ccall('quiet_decoder_profile_str', 'pointer', ['array', 'array'], [c_profiles, c_profile]);

    // Pointers to stuff.
    this.decoder = Module.ccall('quiet_decoder_create', 'pointer', ['pointer', 'number'], [opt, SAMPLE_RATE]);
    this.samples = Module.ccall('malloc', 'pointer', ['number'], [4 * SAMPLE_BUFFER_SIZE]);
    this.frame = Module.ccall('malloc', 'pointer', ['number'], [FRAME_BUFFER_SIZE]);

    // Fail count.
    this.lastChecksumFailCount = 0;
  }

  onReceiveFail(num_fails) {
    console.log(`OnReceiveFail: num_fails=${num_fails}`);
  }

  onAudio(input) {
    const sample_view = Module.HEAPF32.subarray(this.samples/4, this.samples/4 + SAMPLE_BUFFER_SIZE);
    sample_view.set(input);
    setImmediate(::this.consume);
  }

  consume() {
    Module.ccall('quiet_decoder_consume', 'number', ['pointer', 'pointer', 'number'], [this.decoder, this.samples, SAMPLE_BUFFER_SIZE]);
    setImmediate(::this.readBuf);
    let currentChecksumFailCount = Module.ccall('quiet_decoder_checksum_fails', 'number', ['pointer'], [this.decoder]);
    if (currentChecksumFailCount > this.lastChecksumFailCount) {
      this.onReceiveFail(currentChecksumFailCount);
    }
    this.lastChecksumFailCount = currentChecksumFailCount;
  }

  readBuf() {
    while (true) {
      const read = Module.ccall('quiet_decoder_recv', 'number', ['pointer', 'pointer', 'number'], [this.decoder, this.frame, FRAME_BUFFER_SIZE]);
      if (read === -1) {
        break;
      }
      const frameArray = Module.HEAP8.slice(this.frame, this.frame + read);
      console.log(frameArray);
    }
  }
}

const receiver = new Receiver(profile);

let biggest = -Infinity;
let smallest = Infinity;
let count = 0;
const maxmin = function(num) {
  count += 1;
  if (num > biggest) {
    biggest = num;
  }
  if (num < smallest) {
    smallest = num;
  }
};

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

const start = Date.now();

const file = function() {
  // const fStream = fs.createReadStream("obs.pcm");
  process.stdin.on("readable", () => {
    let chunk;
    const doOnce = () => {
      if (null !== (chunk = process.stdin.read(SAMPLE_BUFFER_SIZE * 4))) {
        // const arr = [];
        // for (let offset = 0; offset < chunk.length; offset+=4) {
        //   const num = chunk.readFloatLE(offset);
        //   maxmin(num);
        //   arr.push(num);
        // }
        const arr = new Float32Array(toArrayBuffer(chunk));
        // arr.forEach(maxmin);
        receiver.onAudio(arr);
        // arr.forEach((elem) => {
          // maxmin(elem);
        // })
        // const input = arr.map((elem) => {
          // maxmin(elem);
          // return (elem - 128) / 255;
        // });
        // console.log(JSON.stringify(input));
        // receiver.onAudio(new Float32Array(input));
        setTimeout(doOnce, 320);
      }
    }
    doOnce();
  });

};

file();

// const workingSamples = require("./workingsamples.json");
// let idx = 0;
// // console.log(workingSamples.length);
// const one = function() {
//   receiver.onAudio(new Float32Array(workingSamples[idx]));
//   idx += 1;
//   if (idx < workingSamples.length) {
//     setTimeout(one, 300);
//   }
// }
// one();

