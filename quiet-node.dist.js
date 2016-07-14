"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var profile = {
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

var omgwtf = function omgwtf(filename) {
  var stuff = _fs2.default.readFileSync("./quiet-emscripten.js", "utf8");
  return eval(stuff);
};

// omgwtf("./quiet-emscripten.js");
// omgwtf("./libfec.js");
// console.log(omgwtf("./libfec.js"));

var Module = require("./quiet-emscripten");
Module.Runtime.loadDynamicLibrary("./libfec.js");

var SAMPLE_RATE = 44100;
var SAMPLE_BUFFER_SIZE = 16384;
var FRAME_BUFFER_SIZE = Math.pow(2, 14);

var Receiver = function () {
  function Receiver(profile) {
    _classCallCheck(this, Receiver);

    var c_profiles = Module.intArrayFromString(JSON.stringify({ "profile": profile }));
    var c_profile = Module.intArrayFromString("profile");
    var opt = Module.ccall('quiet_decoder_profile_str', 'pointer', ['array', 'array'], [c_profiles, c_profile]);

    // Pointers to stuff.
    this.decoder = Module.ccall('quiet_decoder_create', 'pointer', ['pointer', 'number'], [opt, SAMPLE_RATE]);
    this.samples = Module.ccall('malloc', 'pointer', ['number'], [4 * SAMPLE_BUFFER_SIZE]);
    this.frame = Module.ccall('malloc', 'pointer', ['number'], [FRAME_BUFFER_SIZE]);

    // Fail count.
    this.lastChecksumFailCount = 0;
  }

  _createClass(Receiver, [{
    key: "onReceiveFail",
    value: function onReceiveFail(num_fails) {
      console.log("OnReceiveFail: num_fails=" + num_fails);
    }
  }, {
    key: "onAudio",
    value: function onAudio(input) {
      var sample_view = Module.HEAPF32.subarray(this.samples / 4, this.samples / 4 + SAMPLE_BUFFER_SIZE);
      sample_view.set(input);
      setImmediate(this.consume.bind(this));
    }
  }, {
    key: "consume",
    value: function consume() {
      Module.ccall('quiet_decoder_consume', 'number', ['pointer', 'pointer', 'number'], [this.decoder, this.samples, SAMPLE_BUFFER_SIZE]);
      setImmediate(this.readBuf.bind(this));
      var currentChecksumFailCount = Module.ccall('quiet_decoder_checksum_fails', 'number', ['pointer'], [this.decoder]);
      if (currentChecksumFailCount > this.lastChecksumFailCount) {
        this.onReceiveFail(currentChecksumFailCount);
      }
      this.lastChecksumFailCount = currentChecksumFailCount;
    }
  }, {
    key: "readBuf",
    value: function readBuf() {
      while (true) {
        var read = Module.ccall('quiet_decoder_recv', 'number', ['pointer', 'pointer', 'number'], [this.decoder, this.frame, FRAME_BUFFER_SIZE]);
        if (read === -1) {
          break;
        }
        var frameArray = Module.HEAP8.slice(this.frame, this.frame + read);
        console.log(frameArray);
      }
    }
  }]);

  return Receiver;
}();

var receiver = new Receiver(profile);

var biggest = -Infinity;
var smallest = Infinity;
var count = 0;
var maxmin = function maxmin(num) {
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

var start = Date.now();

var file = function file() {
  var fStream = _fs2.default.createReadStream("obs.pcm");
  fStream.on("readable", function () {
    var chunk = void 0;
    var doOnce = function doOnce() {
      if (null !== (chunk = fStream.read(SAMPLE_BUFFER_SIZE * 4))) {
        // const arr = [];
        // for (let offset = 0; offset < chunk.length; offset+=4) {
        //   const num = chunk.readFloatLE(offset);
        //   maxmin(num);
        //   arr.push(num);
        // }
        var arr = new Float32Array(toArrayBuffer(chunk));
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
    };
    doOnce();
  });

  fStream.on("end", function () {});
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

