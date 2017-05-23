//"use strict";

var LibraryOpenAL = {
	$AL__deps: ['$Browser'],
	$AL: {
		contexts: [],
		currentCtx: null,

		alcErr: 0,

		stringCache: {},
		alcStringCache: {},

		QUEUE_INTERVAL: 25,
		QUEUE_LOOKAHEAD: 100,

		updateSources: function updateSources(context) {
			// If we are animating using the requestAnimationFrame method, then the main loop does not run when in the background.
			// To give a perfect glitch-free audio stop when switching from foreground to background, we need to avoid updating
			// audio altogether when in the background, so detect that case and kill audio buffer streaming if so.
			if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && document['visibilityState'] != 'visible') return;

			for (var srcId in context.sources) {
				AL.updateSource(context.sources[srcId]);
			}
		},

		updateSource: function updateSource(src) {
			// See comment on updateSources above.
			if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && document['visibilityState'] != 'visible') return;

			if (src.state !== 0x1012 /* AL_PLAYING */) {
				return;
			}

			AL.shiftOutputQueue(src);

			var currentTime = src.context.audioCtx.currentTime;
			var startTime = src.bufPosition;
			var startOffset = 0;

			while (startOffset < (AL.QUEUE_LOOKAHEAD / 1000)) {
			}


			while (startOffset
			for (var i = src.bufsProcessed; i < src.bufQueue.length; i++) {
			}

			for (var bufSrc in src.outputQueue) {
				var startOffset = (startTime - currentTime) / src.playbackRate;
				var endTime = startTime + entry.bufSrc.duration; // n.b. entry.bufSrc.duration already factors in playbackRate, so no divide by src.playbackRate on it.

				if (startOffset < (AL.QUEUE_LOOKAHEAD / 1000) && !bufSrc) {
					// If the start offset is negative, we need to offset the actual buffer.
					var offset = Math.abs(Math.min(startOffset, 0));

					bufSrc = src.context.audioCtx.createBufferSource();
					bufSrc.buffer = buffer;
					bufSrc.connect(src.gain);
					if (src.playbackRate != 1.0) bufSrc.playbackRate.value = src.playbackRate;
					bufSrc.duration = buffer.duration / src.playbackRate;
					if (typeof(bufSrc.start) !== 'undefined') {
						bufSrc.start(startTime, offset);
					} else if (typeof(bufSrc.noteOn) !== 'undefined') {
						bufSrc.noteOn(startTime);
#if OPENAL_DEBUG
						if (offset > 0) {
							Runtime.warnOnce('The current browser does not support AudioBufferSourceNode.start(when, offset); method, so cannot play back audio with an offset '+offset+' secs! Audio glitches will occur!');
						}
#endif
					}
#if OPENAL_DEBUG
					else {
						Runtime.warnOnce('Unable to start AudioBufferSourceNode playback! Not supported by the browser?');
					}

					console.log('updateSource queuing buffer ' + i + ' for source ' + src.id + ' at ' + startTime + ' (offset by ' + offset + ')');
#endif
				}

				startTime = endTime;
			}
		},

		// Clean up old sourceBuffers.
		shiftOutputQueue: function shiftOutputQueue(src) {
			var currentTime = src.context.audioCtx.currentTime;
			var startTime = src.bufPosition;

			while (src.outputQueue.length) {
				var bufSrc = src.outputQueue[0];
				var endTime = startTime + bufSrc.duration; // n.b. bufSrc.duration already factors in playbackRate, so no divide by src.playbackRate on it.

				if (currentTime >= endTime) {
					// Update our location in the queue.
					src.bufPosition = endTime;
					src.bufsProcessed++;
					src.outputQueue.shift();
				} else {
					break;
				}
			}
		},

		setSourceState: function setSourceState(src, state) {
			if (state === 0x1012 /* AL_PLAYING */) {
				if (src.state !== 0x1013 /* AL_PAUSED */) {
					src.state = 0x1012 /* AL_PLAYING */;
					// Reset our position.
					src.bufPosition = AL.currentCtx.audioCtx.currentTime;
					src.bufsProcessed = 0;
#if OPENAL_DEBUG
					console.log('setSourceState resetting and playing source ' + src.id);
#endif
				} else {
					src.state = 0x1012 /* AL_PLAYING */;
					// Use the current offset from src.bufPosition to resume at the correct point.
					src.bufPosition = AL.currentCtx.audioCtx.currentTime - src.bufPosition;
#if OPENAL_DEBUG
					console.log('setSourceState resuming source ' + src.id + ' at ' + src.bufPosition.toFixed(4));
#endif
				}
				AL.stopOutputQueue(src);
				AL.updateSource(src);
			} else if (state === 0x1013 /* AL_PAUSED */) {
				if (src.state === 0x1012 /* AL_PLAYING */) {
					src.state = 0x1013 /* AL_PAUSED */;
					// Store off the current offset to restore with on resume.
					src.bufPosition = AL.currentCtx.audioCtx.currentTime - src.bufPosition;
					AL.stopOutputQueue(src);
#if OPENAL_DEBUG
					console.log('setSourceState pausing source ' + src.id + ' at ' + src.bufPosition.toFixed(4));
#endif
				}
			} else if (state === 0x1014 /* AL_STOPPED */) {
				if (src.state !== 0x1011 /* AL_INITIAL */) {
					src.state = 0x1014 /* AL_STOPPED */;
					src.bufsProcessed = src.bufQueue.length;
					AL.stopOutputQueue(src);
#if OPENAL_DEBUG
					console.log('setSourceState stopping source ' + src.id);
#endif
				}
			} else if (state == 0x1011 /* AL_INITIAL */) {
				if (src.state !== 0x1011 /* AL_INITIAL */) {
					src.state = 0x1011 /* AL_INITIAL */;
					src.bufPosition = 0;
					src.bufsProcessed = 0;
#if OPENAL_DEBUG
					console.log('setSourceState initializing source ' + src.id);
#endif
				}
			}
		},

		stopOutputQueue: function stopOutputQueue(src) {
			for (var i = 0; i < src.outputQueue.length; i++) {
				var bufSource = src.outputQueue[i];
				if (bufSource) {
					bufSource.stop(0);
					bufSource = null;
				}
			}
		}
	},

	alcProcessContext: function(contextId) {},
	alcSuspendContext: function(contextId) {},

	alcMakeContextCurrent: function(contextId) {
		if (contextId == 0) {
			AL.currentCtx = null;
			return 0;
		} else {
			AL.currentCtx = AL.contexts[contextId - 1];
			return 1;
		}
	},

	alcGetContextsDevice: function(contextId) {
		if (contextId <= AL.contexts.length && contextId > 0) {
			// Returns the only one audio device
			return 1;
		}
		return 0;
	},

	alcGetCurrentContext: function() {
		if (AL.currentCtx !== null) {
			return AL.currentCtx.id;
		} else {
			return 0;
		}
	},

	alcDestroyContext: function(contextId) {
		var ctx = AL.contexts[contextId - 1];
		if (AL.currentCtx === ctx) {
#if OPENAL_DEBUG
			console.log("alcDestroyContext called with an invalid context");
#endif
			AL.alcErr = 0xA002 /* ALC_INVALID_CONTEXT */;
			return;
		}

		// Stop playback, etc
		clearInterval(AL.contexts[contextId - 1].interval);
		delete AL.contexts[contextId - 1];
	},

	alcCloseDevice: function(device) {
		// Stop playback, etc
	},

	alcOpenDevice: function(deviceName) {
		if (typeof(AudioContext) !== "undefined" || typeof(webkitAudioContext) !== "undefined") {
			return 1; // non-null pointer -- we just simulate one device
		} else {
			return 0;
		}
	},

	alcCreateContext: function(device, attrList) {
		if (device != 1) {
#if OPENAL_DEBUG
			console.log("alcCreateContext called with an invalid device");
#endif
			AL.alcErr = 0xA001; /* ALC_INVALID_DEVICE */
			return 0;
		}

		if (attrList) {
#if OPENAL_DEBUG
			console.log("The attrList argument of alcCreateContext is not supported yet");
#endif
			AL.alcErr = 0xA004; /* ALC_INVALID_VALUE */
			return 0;
		}

		var ac;
		try {
			ac = new AudioContext();
		} catch (e) {
			try {
				ac = new webkitAudioContext();
			} catch (e) {}
		}

		if (ac) {
			// Old Web Audio API (e.g. Safari 6.0.5) had an inconsistently named createGainNode function.
			if (typeof(ac.createGain) === 'undefined') ac.createGain = ac.createGainNode;

			var gain = ac.createGain();
			gain.connect(ac.destination);
			// Extend the Web Audio API AudioListener object with a few tracking values of our own.
			ac.listener._position = [0, 0, 0];
			ac.listener._velocity = [0, 0, 0];
			ac.listener._orientation = [0, 0, 0, 0, 0, 0];
			var context = {
				id: AL.contexts.length + 1;
				audioCtx: ac,
				err: 0,
				sources: [],
				buffers: [],
				interval: setInterval(function() { AL.updateSources(context); }, AL.QUEUE_INTERVAL),
				gain: gain
			};
			AL.contexts.push(context);
			return context.id;
		} else {
			AL.alcErr = 0xA001; /* ALC_INVALID_DEVICE */
			return 0;
		}
	},

	alGetError: function() {
		if (!AL.currentCtx) {
			return 0xA004 /* AL_INVALID_OPERATION */;
		} else {
			// Reset error on get.
			var err = AL.currentCtx.err;
			AL.currentCtx.err = 0 /* AL_NO_ERROR */;
			return err;
		}
	},

	alcGetError: function(device) {
		var err = AL.alcErr;
		AL.alcErr = 0;
		return err;
	},

	alcGetIntegerv: function(device, param, size, data) {
		if (size == 0 || !data) {
			AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
			return;
		}

		switch(param) {
		case 0x1000 /* ALC_MAJOR_VERSION */:
			{{{ makeSetValue('data', '0', '1', 'i32') }}};
			break;
		case 0x1001 /* ALC_MINOR_VERSION */:
			{{{ makeSetValue('data', '0', '1', 'i32') }}};
			break;
		case 0x1002 /* ALC_ATTRIBUTES_SIZE */:
			if (!device) {
				AL.alcErr = 0xA001 /* ALC_INVALID_DEVICE */;
				return 0;
			}
			{{{ makeSetValue('data', '0', '1', 'i32') }}};
			break;
		case 0x1003 /* ALC_ALL_ATTRIBUTES */:
			if (!device) {
				AL.alcErr = 0xA001 /* ALC_INVALID_DEVICE */;
				return 0;
			}
			{{{ makeSetValue('data', '0', '0', 'i32') }}};
			break;
		case 0x1007 /* ALC_FREQUENCY */:
			if (!device) {
				AL.alcErr = 0xA001 /* ALC_INVALID_DEVICE */;
				return 0;
			}
			if (!AL.currentCtx) {
				AL.alcErr = 0xA002 /* ALC_INVALID_CONTEXT */;
				return 0;
			}
			{{{ makeSetValue('data', '0', 'AL.currentCtx.audioCtx.sampleRate', 'i32') }}};
			break;
		case 0x1010 /* ALC_MONO_SOURCES */:
		case 0x1011 /* ALC_STEREO_SOURCES */:
			if (!device) {
				AL.alcErr = 0xA001 /* ALC_INVALID_DEVICE */;
				return 0;
			}
			{{{ makeSetValue('data', '0', '0x7FFFFFFF', 'i32') }}};
			break;
		case 0x20003 /* ALC_MAX_AUXILIARY_SENDS */:
			if (!device) {
				AL.currentCtx.err = 0xA001 /* ALC_INVALID_DEVICE */;
				return 0;
			}
			{{{ makeSetValue('data', '0', '1', 'i32') }}};
		default:
#if OPENAL_DEBUG
			console.log("alcGetIntegerv with param " + param + " not implemented yet");
#endif
			AL.alcErr = 0xA003 /* ALC_INVALID_ENUM */;
			break;
		}
	},

	alDeleteSources: function(count, sourceIds) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alDeleteSources called without a valid context");
#endif
			return;
		}

		for (var i = 0; i < count; ++i) {
			let srcId = {{{ makeGetValue('sourceIds', 'i*4', 'i32') }}};
			let src = AL.currentCtx.sources[srcId - 1];
			if (!AL.currentCtx.sources[srcId - 1]) {
#if OPENAL_DEBUG
				console.error("alDeleteSources called with an invalid source");
#endif
				AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
				return;
			}
		}

		for (var i = 0; i < count; ++i) {
			let srcId = {{{ makeGetValue('sourceIds', 'i*4', 'i32') }}};
			AL.setSourceState(AL.currentCtx.sources[srcId - 1], 0x1014 /* AL_STOPPED */);
			delete AL.currentCtx.sources[srcId - 1];
		}
	},

	alGenSources: function(count, sourceIds) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGenSources called without a valid context");
#endif
			return;
		}
		for (var i = 0; i < count; ++i) {
			var gain = AL.currentCtx.audioCtx.createGain();
			gain.connect(AL.currentCtx.gain);
			let src = {
				context: AL.currentCtx,
				id: AL.currentCtx.sources.length + 1,
				type: 0x1030 /* AL_UNDETERMINED */,
				state: 0x1011 /* AL_INITIAL */,
				bufQueue: [],
				outputQueue: [],
				loop: false,
				playbackRate: 1,
				_position: [0, 0, 0],
				_velocity: [0, 0, 0],
				_direction: [0, 0, 0],
				get refDistance() {
					return this._refDistance || 1;
				},
				set refDistance(val) {
					this._refDistance = val;
					if (this.panner) this.panner.refDistance = val;
				},
				get maxDistance() {
					return this._maxDistance || 10000;
				},
				set maxDistance(val) {
					this._maxDistance = val;
					if (this.panner) this.panner.maxDistance = val;
				},
				get rolloffFactor() {
					return this._rolloffFactor || 1;
				},
				set rolloffFactor(val) {
					this._rolloffFactor = val;
					if (this.panner) this.panner.rolloffFactor = val;
				},
				get position() {
					return this._position;
				},
				set position(val) {
					this._position[0] = val[0];
					this._position[1] = val[1];
					this._position[2] = val[2];
					if (this.panner) this.panner.setPosition(val[0], val[1], val[2]);
				},
				get velocity() {
					return this._velocity;
				},
				set velocity(val) {
					this._velocity[0] = val[0];
					this._velocity[1] = val[1];
					this._velocity[2] = val[2];
					// TODO: The velocity values are not currently used to implement a doppler effect.
					// If support for doppler effect is reintroduced, compute the doppler
					// speed pitch factor and apply it here.
				},
				get direction() {
					return this._direction;
				},
				set direction(val) {
					this._direction[0] = val[0];
					this._direction[1] = val[1];
					this._direction[2] = val[2];
					if (this.panner) this.panner.setOrientation(val[0], val[1], val[2]);
				},
				get coneOuterGain() {
					return this._coneOuterGain || 0.0;
				},
				set coneOuterGain(val) {
					this._coneOuterGain = val;
					if (this.panner) this.panner.coneOuterGain = val;
				},
				get coneInnerAngle() {
					return this._coneInnerAngle || 360.0;
				},
				set coneInnerAngle(val) {
					this._coneInnerAngle = val;
					if (this.panner) this.panner.coneInnerAngle = val;
				},
				get coneOuterAngle() {
					return this._coneOuterAngle || 360.0;
				},
				set coneOuterAngle(val) {
					this._coneOuterAngle = val;
					if (this.panner) this.panner.coneOuterAngle = val;
				},
				gain: gain,
				panner: null,
				bufsProcessed: 0,
				bufPosition: 0
			};
			AL.currentCtx.sources.push(src);
			{{{ makeSetValue('sourceIds', 'i*4', 'src.id', 'i32') }}};
		}
	},

	alIsSource: function(sourceId) {
		if (!AL.currentCtx) {
			return false;
		}

		if (!AL.currentCtx.sources[sourceId - 1]) {
			return false;
		} else {
			return true;
		}
	},

	alSourcei: function(sourceId, param, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourcei called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourcei called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		case 0x1001 /* AL_CONE_INNER_ANGLE */:
			src.coneInnerAngle = value;
			break;
		case 0x1002 /* AL_CONE_OUTER_ANGLE */:
			src.coneOuterAngle = value;
			break;
		case 0x1007 /* AL_LOOPING */:
			src.loop = (value === 1 /* AL_TRUE */);
			break;
		case 0x1009 /* AL_BUFFER */:
			if (value == 0) {
				src.type = 0x1030 /* AL_UNDETERMINED */;
				src.bufQueue = [];
				src.outputQueue = [];
			} else {
				var buf = AL.currentCtx.buffers[value - 1];
				if (!buf) {
#if OPENAL_DEBUG
					console.error("alSourcei(AL_BUFFER) called with an invalid buffer");
#endif
					AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
					return;
				}

				src.type = 0x1028 /* AL_STATIC */;
				src.bufQueue = [buf];
				src.outputQueue = [];
			}

			AL.updateSource(src);
			break;
		case 0x202 /* AL_SOURCE_RELATIVE */:
			if (value === 1 /* AL_TRUE */) {
				if (src.panner) {
					src.panner = null;

					// Disconnect from the panner.
					src.gain.disconnect();

					src.gain.connect(AL.currentCtx.gain);
				}
			} else if (value === 0 /* AL_FALSE */) {
				if (!src.panner) {
					var panner = src.panner = AL.currentCtx.audioCtx.createPanner();
					panner.panningModel = "equalpower";
					panner.distanceModel = "linear";
					panner.refDistance = src.refDistance;
					panner.maxDistance = src.maxDistance;
					panner.rolloffFactor = src.rolloffFactor;
					panner.setPosition(src.position[0], src.position[1], src.position[2]);
					// TODO: If support for doppler effect is reintroduced, compute the doppler
					// speed pitch factor and apply it here.
					panner.connect(AL.currentCtx.gain);

					// Disconnect from the default source.
					src.gain.disconnect();

					src.gain.connect(panner);
				}
			} else {
				AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
			}
			break;
		default:
#if OPENAL_DEBUG
			console.log("alSourcei with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alSourcef: function(sourceId, param, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourcef called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourcef called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		case 0x1003 /* AL_PITCH */:
			if (value <= 0) {
				AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
				return;
			}
			src.playbackRate = value;

			if (src.state === 0x1012 /* AL_PLAYING */) {
				// update currently playing entry
				AL.shiftOutputQueue(src);
				var bufSrc = src.outputQueue[0];
				if (!bufSrc) return; // It is possible that AL.updateSources() has not yet fed the next buffer, if so, skip.
				var currentTime = AL.currentCtx.audioCtx.currentTime;
				var oldrate = bufSrc.playbackRate.value;
				var offset = currentTime - src.bufPosition;
				// bufSrc.duration is expressed after factoring in playbackRate, so when changing playback rate, need
				// to recompute/rescale the rate to the new playback speed.
				bufSrc.duration = (bufSrc.duration - offset) * oldrate / src.playbackRate;
				if (bufSrc.playbackRate.value != src.playbackRate) bufSrc.playbackRate.value = src.playbackRate;
				src.bufPosition = currentTime;

				// stop other buffers
				for (var k = 1; k < src.outputQueue.length; k++) {
					var bufSrc = src.outputQueue[k];
					bufSrc.stop();
				}
				src.outputQueue.length = 1;
				// update the source to reschedule buffers with the new playbackRate
				AL.updateSource(src);
			}
			break;
		case 0x100A /* AL_GAIN */:
			if (src.gain.gain.value != value) src.gain.gain.value = value;
			break;
		// case 0x100D /* AL_MIN_GAIN */:
		//	 break;
		// case 0x100E /* AL_MAX_GAIN */:
		//	 break;
		case 0x1023 /* AL_MAX_DISTANCE */:
			src.maxDistance = value;
			break;
		case 0x1021 /* AL_ROLLOFF_FACTOR */:
			src.rolloffFactor = value;
			break;
		case 0x1022 /* AL_CONE_OUTER_GAIN */:
			src.coneOuterGain = value;
			break;
		case 0x1001 /* AL_CONE_INNER_ANGLE */:
			src.coneInnerAngle = value;
			break;
		case 0x1002 /* AL_CONE_OUTER_ANGLE */:
			src.coneOuterAngle = value;
			break;
		case 0x1020 /* AL_REFERENCE_DISTANCE */:
			src.refDistance = value;
			break;
		default:
#if OPENAL_DEBUG
			console.log("alSourcef with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alSource3i__deps: ['alSource3f'],
	alSource3i: function(sourceId, param, v1, v2, v3) {
		_alSource3f(sourceId, param, v1, v2, v3);
	},

	alSourceiv__deps: ['alSource3f'],
	alSourceiv: function(sourceId, param, value) {
		_alSource3f(sourceId, param,
			{{{ makeGetValue('value', '0', 'i32') }}},
			{{{ makeGetValue('value', '4', 'i32') }}},
			{{{ makeGetValue('value', '8', 'i32') }}});
	},

	alSource3f: function(sourceId, param, v1, v2, v3) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSource3f called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSource3f called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		case 0x1004 /* AL_POSITION */:
			src.position[0] = v1;
			src.position[1] = v2;
			src.position[2] = v3;
			break;
		case 0x1005 /* AL_DIRECTION */:
			src.direction[0] = v1;
			src.direction[1] = v2;
			src.direction[2] = v3;
			break;
		case 0x1006 /* AL_VELOCITY */:
			src.velocity[0] = v1;
			src.velocity[1] = v2;
			src.velocity[2] = v3;
			break;
		default:
#if OPENAL_DEBUG
			console.log("alSource3f with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alSourcefv__deps: ['alSource3f'],
	alSourcefv: function(sourceId, param, value) {
		_alSource3f(sourceId, param,
			{{{ makeGetValue('value', '0', 'float') }}},
			{{{ makeGetValue('value', '4', 'float') }}},
			{{{ makeGetValue('value', '8', 'float') }}});
	},

	alSourceQueueBuffers: function(sourceId, count, buffers) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourceQueueBuffers called without a valid context");
#endif
			AL.currentCtx.err = 0xA004 /* AL_INVALID_OPERATION */;
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourceQueueBuffers called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		if (src.type === 0x1028 /* AL_STATIC */) {
#if OPENAL_DEBUG
			console.error("alSourceQueueBuffers called while a static buffer is bound");
#endif
			AL.currentCtx.err = 0xA004 /* AL_INVALID_OPERATION */;
			return;
		}
		for (var i = 0; i < count; ++i) {
			var bufferId = {{{ makeGetValue('buffers', 'i*4', 'i32') }}};
			if (bufferId > AL.currentCtx.buffers.length) {
#if OPENAL_DEBUG
				console.error("alSourceQueueBuffers called with an invalid buffer");
#endif
				AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
				return;
			}
		}

		src.type = 0x1029 /* AL_STREAMING */;
		for (var i = 0; i < count; ++i) {
			var bufferId = {{{ makeGetValue('buffers', 'i*4', 'i32') }}};
			src.bufQueue.push(AL.currentCtx.buffers[bufferId - 1]);
		}

		AL.updateSource(src);
	},

	alSourceUnqueueBuffers: function(sourceId, count, bufferIds) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourceUnqueueBuffers called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourceUnqueueBuffers called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}

		if (count > src.bufsProcessed) {
			AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
			return;
		}

		for (var i = 0; i < count; i++) {
			var bufId = src.bufQueue.shift();
			// Write the buffers index out to the return list.
			{{{ makeSetValue('bufferIds', 'i*4', 'bufId', 'i32') }}};
			src.bufsProcessed--;
		}

		AL.updateSource(src);
	},

	alDeleteBuffers: function(count, bufferIds)
	{
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alDeleteBuffers called without a valid context");
#endif
			return;
		}
		if (count > AL.currentCtx.buffers.length) {
			AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
			return;
		}

		for (var i = 0; i < count; ++i) {
			var bufId = {{{ makeGetValue('bufferIds', 'i*4', 'i32') }}};

			// Make sure the buffer index is valid.
			if (!AL.currentCtx.buf[bufId - 1]) {
#if OPENAL_DEBUG
				console.error("alDeleteBuffers called with an invalid buffer");
#endif
				AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
				return;
			}

			// Make sure the buffer is no longer in use.
			for (var src in AL.currentCtx.sources) {
				for (var k = 0; k < src.bufQueue.length; k++) {
					if (bufId === src.bufQueue[k].id) {
#if OPENAL_DEBUG
						console.error("alDeleteBuffers called with a used buffer");
#endif
						AL.currentCtx.err = 0xA004 /* AL_INVALID_OPERATION */;
						return;
					}
				}
			}
		}

		for (var i = 0; i < count; ++i) {
			var bufId = {{{ makeGetValue('bufferIds', 'i*4', 'i32') }}};
			delete AL.currentCtx.buffers[bufId - 1];
		}
	},

	alGenBuffers: function(count, bufferIds) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGenBuffers called without a valid context");
#endif
			return;
		}

		for (var i = 0; i < count; ++i) {
			let buf = {
				id = AL.currentCtx.buffers.length + 1;
				audioBuf = null;
			};
			AL.currentCtx.buffers.push(buf);
			{{{ makeSetValue('bufferIds', 'i*4', 'buf.id', 'i32') }}};
		}
	},

	alIsBuffer: function(bufferId) {
		if (!AL.currentCtx) {
			return false;
		}
		if (bufferId > AL.currentCtx.buffers.length) {
			return false;
		}

		if (!AL.currentCtx.buffers[bufferId - 1]) {
			return false;
		} else {
			return true;
		}
	},

	alBufferData: function(bufferId, format, data, size, freq) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alBufferData called without a valid context");
#endif
			return;
		}

		var buf = AL.currentCtx.buffers[bufferId - 1];
		if (!buf) {
#if OPENAL_DEBUG
			console.error("alBufferData called with an invalid buffer");
#endif
			return;
		}

		try {
			switch (format) {
			case 0x1100 /* AL_FORMAT_MONO8 */:
				var ab = AL.currentCtx.audioCtx.createBuffer(1, size, freq);
				ab.bytesPerSample = 1;
				var channel0 = ab.getChannelData(0);
				for (var i = 0; i < size; ++i) channel0[i] = HEAPU8[data++] * 0.0078125 /* 1/128 */ - 1.0;
				break;
			case 0x1101 /* AL_FORMAT_MONO16 */:
				var ab = AL.currentCtx.audioCtx.createBuffer(1, size>>1, freq);
				ab.bytesPerSample = 2;
				var channel0 = ab.getChannelData(0);
				data >>= 1;
				for (var i = 0; i < size>>1; ++i) channel0[i] = HEAP16[data++] * 0.000030517578125 /* 1/32768 */;
				break;
			case 0x1102 /* AL_FORMAT_STEREO8 */:
				var ab = AL.currentCtx.audioCtx.createBuffer(2, size>>1, freq);
				ab.bytesPerSample = 1;
				var channel0 = ab.getChannelData(0);
				var channel1 = ab.getChannelData(1);
				for (var i = 0; i < size>>1; ++i) {
					channel0[i] = HEAPU8[data++] * 0.0078125 /* 1/128 */ - 1.0;
					channel1[i] = HEAPU8[data++] * 0.0078125 /* 1/128 */ - 1.0;
				}
				break;
			case 0x1103 /* AL_FORMAT_STEREO16 */:
				var ab = AL.currentCtx.audioCtx.createBuffer(2, size>>2, freq);
				ab.bytesPerSample = 2;
				var channel0 = ab.getChannelData(0);
				var channel1 = ab.getChannelData(1);
				data >>= 1;
				for (var i = 0; i < size>>2; ++i) {
					channel0[i] = HEAP16[data++] * 0.000030517578125 /* 1/32768 */;
					channel1[i] = HEAP16[data++] * 0.000030517578125 /* 1/32768 */;
				}
				break;
			case 0x10010 /* AL_FORMAT_MONO_FLOAT32 */:
				var ab = AL.currentCtx.audioCtx.createBuffer(1, size>>2, freq);
				ab.bytesPerSample = 4;
				var channel0 = ab.getChannelData(0);
				data >>= 2;
				for (var i = 0; i < size>>2; ++i) channel0[i] = HEAPF32[data++];
				break;
			case 0x10011 /* AL_FORMAT_STEREO_FLOAT32 */:
				var ab = AL.currentCtx.audioCtx.createBuffer(2, size>>3, freq);
				ab.bytesPerSample = 4;
				var channel0 = ab.getChannelData(0);
				var channel1 = ab.getChannelData(1);
				data >>= 2;
				for (var i = 0; i < size>>2; ++i) {
					channel0[i] = HEAPF32[data++];
					channel1[i] = HEAPF32[data++];
				}
				break;
			default:
#if OPENAL_DEBUG
				console.error("alBufferData called with invalid format " + format);
#endif
				AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
				break;
			}
			buf.audioBuf = ab;
		} catch (e) {
#if OPENAL_DEBUG
			console.error("alBufferData upload failed with an exception " + e);
#endif
			AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
		}
	},

	alGetBufferi: function(bufferId, param, value)
	{
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetBufferi called without a valid context");
#endif
			return;
		}
		var buf = AL.currentCtx.buffers[buffer - 1];
		if (!buf) {
#if OPENAL_DEBUG
			console.error("alGetBufferi called with an invalid buffer");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		case 0x2001 /* AL_FREQUENCY */:
			{{{ makeSetValue('value', '0', 'buf.audioBuf.sampleRate', 'i32') }}};
			break;
		case 0x2002 /* AL_BITS */:
			{{{ makeSetValue('value', '0', 'buf.audioBuf.bytesPerSample * 8', 'i32') }}};
			break;
		case 0x2003 /* AL_CHANNELS */:
			{{{ makeSetValue('value', '0', 'buf.audioBuf.numberOfChannels', 'i32') }}};
			break;
		case 0x2004 /* AL_SIZE */:
			{{{ makeSetValue('value', '0', 'buf.audioBuf.length * buf.audioBuf.bytesPerSample * buf.audioBuf.numberOfChannels', 'i32') }}};
			break;
		default:
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alSourcePlay: function(sourceId) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourcePlay called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourcePlay called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		AL.setSourceState(src, 0x1012 /* AL_PLAYING */);
	},

	alSourceStop: function(sourceId) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourceStop called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourceStop called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		AL.setSourceState(src, 0x1014 /* AL_STOPPED */);
	},

	alSourceRewind: function(sourceId) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourceRewind called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourceRewind called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		// Stop the source first to clear the source queue
		AL.setSourceState(src, 0x1014 /* AL_STOPPED */);
		// Now set the state of AL_INITIAL according to the specification
		AL.setSourceState(src, 0x1011 /* AL_INITIAL */);
	},

	alSourcePause: function(sourceId) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alSourcePause called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alSourcePause called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		AL.setSourceState(src, 0x1013 /* AL_PAUSED */);
	},

	alGetSourcei: function(sourceId, param, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetSourcei called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alGetSourcei called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}

		// Being that we have no way to receive end events from buffer nodes,
		// we currently proccess and update a source's buffer queue every
		// ~QUEUE_INTERVAL milliseconds. However, this interval is not precise,
		// so we also forcefully update the source when alGetSourcei is queried
		// to aid in the common scenario of application calling alGetSourcei(AL_BUFFERS_PROCESSED)
		// to recycle buffers.
		AL.updateSource(src);

		switch (param) {
		case 0x202 /* AL_SOURCE_RELATIVE */:
			{{{ makeSetValue('value', '0', 'src.panner ? 1 : 0', 'i32') }}};
			break;
		case 0x1001 /* AL_CONE_INNER_ANGLE */:
			{{{ makeSetValue('value', '0', 'src.coneInnerAngle', 'i32') }}};
			break;
		case 0x1002 /* AL_CONE_OUTER_ANGLE */:
			{{{ makeSetValue('value', '0', 'src.coneOuterAngle', 'i32') }}};
			break;
		case 0x1007 /* AL_LOOPING */:
			{{{ makeSetValue('value', '0', 'src.loop', 'i32') }}};
			break;
		case 0x1009 /* AL_BUFFER */:
			if (src.type === 0x1028 /* AL_STATIC */) {
				var buf = src.bufQueue[0];
				{{{ makeSetValue('value', '0', 'buf.id', 'i32') }}};
			} else {
				{{{ makeSetValue('value', '0', '0', 'i32') }}};
			}
			break;
		case 0x1010 /* AL_SOURCE_STATE */:
			{{{ makeSetValue('value', '0', 'src.state', 'i32') }}};
			break;
		case 0x1015 /* AL_BUFFERS_QUEUED */:
			{{{ makeSetValue('value', '0', 'src.bufQueue.length', 'i32') }}}
			break;
		case 0x1016 /* AL_BUFFERS_PROCESSED */:
			if (src.loop) {
				{{{ makeSetValue('value', '0', '0', 'i32') }}}
			} else {
				{{{ makeSetValue('value', '0', 'src.bufsProcessed', 'i32') }}}
			}
			break;
		case 0x1027 /* AL_SOURCE_TYPE */:
			{{{ makeSetValue('value', '0', 'src.type', 'i32') }}}
			break;
		default:
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alGetSourceiv__deps: ['alGetSourcei'],
	alGetSourceiv: function(sourceId, param, values) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetSourceiv called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alGetSourceiv called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		case 0x202 /* AL_SOURCE_RELATIVE */:
		case 0x1001 /* AL_CONE_INNER_ANGLE */:
		case 0x1002 /* AL_CONE_OUTER_ANGLE */:
		case 0x1007 /* AL_LOOPING */:
		case 0x1009 /* AL_BUFFER */:
		case 0x1010 /* AL_SOURCE_STATE */:
		case 0x1015 /* AL_BUFFERS_QUEUED */:
		case 0x1016 /* AL_BUFFERS_PROCESSED */:
			_alGetSourcei(sourceId, param, values);
			break;
		default:
#if OPENAL_DEBUG
			console.error("alGetSourceiv with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alGetSourcef: function(sourceId, param, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetSourcef called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alGetSourcef called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		 case 0x1003 /* AL_PITCH */:
			{{{ makeSetValue('value', '0', 'src.playbackRate', 'float') }}}
			break;
		case 0x100A /* AL_GAIN */:
			{{{ makeSetValue('value', '0', 'src.gain.gain.value', 'float') }}}
			break;
		// case 0x100D /* AL_MIN_GAIN */:
		//	 break;
		// case 0x100E /* AL_MAX_GAIN */:
		//	 break;
		case 0x1023 /* AL_MAX_DISTANCE */:
			{{{ makeSetValue('value', '0', 'src.maxDistance', 'float') }}}
			break;
		case 0x1021 /* AL_ROLLOFF_FACTOR */:
			{{{ makeSetValue('value', '0', 'src.rolloffFactor', 'float') }}}
			break;
		case 0x1022 /* AL_CONE_OUTER_GAIN */:
			{{{ makeSetValue('value', '0', 'src.coneOuterGain', 'float') }}}
			break;
		case 0x1001 /* AL_CONE_INNER_ANGLE */:
			{{{ makeSetValue('value', '0', 'src.coneInnerAngle', 'float') }}}
			break;
		case 0x1002 /* AL_CONE_OUTER_ANGLE */:
			{{{ makeSetValue('value', '0', 'src.coneOuterAngle', 'float') }}}
			break;
		case 0x1020 /* AL_REFERENCE_DISTANCE */:
			{{{ makeSetValue('value', '0', 'src.refDistance', 'float') }}}
			break;
		// case 0x1024 /* AL_SEC_OFFSET */:
		//	 break;
		// case 0x1025 /* AL_SAMPLE_OFFSET */:
		//	 break;
		// case 0x1026 /* AL_BYTE_OFFSET */:
		//	 break;
		default:
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alGetSourcefv__deps: ['alGetSourcef'],
	alGetSourcefv: function(sourceId, param, values) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetSourcefv called without a valid context");
#endif
			return;
		}
		var src = AL.currentCtx.sources[sourceId - 1];
		if (!src) {
#if OPENAL_DEBUG
			console.error("alGetSourcefv called with an invalid source");
#endif
			AL.currentCtx.err = 0xA001 /* AL_INVALID_NAME */;
			return;
		}
		switch (param) {
		case 0x1003 /* AL_PITCH */:
		case 0x100A /* AL_GAIN */:
		case 0x100D /* AL_MIN_GAIN */:
		case 0x100E /* AL_MAX_GAIN */:
		case 0x1023 /* AL_MAX_DISTANCE */:
		case 0x1021 /* AL_ROLLOFF_FACTOR */:
		case 0x1022 /* AL_CONE_OUTER_GAIN */:
		case 0x1001 /* AL_CONE_INNER_ANGLE */:
		case 0x1002 /* AL_CONE_OUTER_ANGLE */:
		case 0x1020 /* AL_REFERENCE_DISTANCE */:
		case 0x1024 /* AL_SEC_OFFSET */:
		case 0x1025 /* AL_SAMPLE_OFFSET */:
		case 0x1026 /* AL_BYTE_OFFSET */:
			_alGetSourcef(sourceId, param, values);
			break;
		case 0x1004 /* AL_POSITION */:
			var position = src.position;
			{{{ makeSetValue('values', '0', 'position[0]', 'float') }}}
			{{{ makeSetValue('values', '4', 'position[1]', 'float') }}}
			{{{ makeSetValue('values', '8', 'position[2]', 'float') }}}
			break;
		case 0x1005 /* AL_DIRECTION */:
			var direction = src.direction;
			{{{ makeSetValue('values', '0', 'direction[0]', 'float') }}}
			{{{ makeSetValue('values', '4', 'direction[1]', 'float') }}}
			{{{ makeSetValue('values', '8', 'direction[2]', 'float') }}}
			break;
		case 0x1006 /* AL_VELOCITY */:
			var velocity = src.velocity;
			{{{ makeSetValue('values', '0', 'velocity[0]', 'float') }}}
			{{{ makeSetValue('values', '4', 'velocity[1]', 'float') }}}
			{{{ makeSetValue('values', '8', 'velocity[2]', 'float') }}}
			break;
		default:
#if OPENAL_DEBUG
			console.error("alGetSourcefv with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alDistanceModel: function(model) {
		if (model !== 0 /* AL_NONE */) {
#if OPENAL_DEBUG
			console.log("Only alDistanceModel(AL_NONE) is currently supported");
#endif
		}
	},

	alGetListenerf: function(pname, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetListenerf called without a valid context");
#endif
			return;
		}
		switch (pname) {
		case 0x100A /* AL_GAIN */:
			{{{ makeSetValue('value', '0', 'AL.currentCtx.gain.gain.value', 'float') }}}
			break;
		default:
#if OPENAL_DEBUG
			console.error("alGetListenerf with param " + pname + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}

	},

	alGetListenerfv: function(pname, values) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetListenerfv called without a valid context");
#endif
			return;
		}
		switch (pname) {
		case 0x1004 /* AL_POSITION */:
			var position = AL.currentCtx.audioCtx.listener._position;
			{{{ makeSetValue('values', '0', 'position[0]', 'float') }}}
			{{{ makeSetValue('values', '4', 'position[1]', 'float') }}}
			{{{ makeSetValue('values', '8', 'position[2]', 'float') }}}
			break;
		case 0x1006 /* AL_VELOCITY */:
			var velocity = AL.currentCtx.audioCtx.listener._velocity;
			{{{ makeSetValue('values', '0', 'velocity[0]', 'float') }}}
			{{{ makeSetValue('values', '4', 'velocity[1]', 'float') }}}
			{{{ makeSetValue('values', '8', 'velocity[2]', 'float') }}}
			break;
		case 0x100F /* AL_ORIENTATION */:
			var orientation = AL.currentCtx.audioCtx.listener._orientation;
			{{{ makeSetValue('values', '0', 'orientation[0]', 'float') }}}
			{{{ makeSetValue('values', '4', 'orientation[1]', 'float') }}}
			{{{ makeSetValue('values', '8', 'orientation[2]', 'float') }}}
			{{{ makeSetValue('values', '12', 'orientation[3]', 'float') }}}
			{{{ makeSetValue('values', '16', 'orientation[4]', 'float') }}}
			{{{ makeSetValue('values', '20', 'orientation[5]', 'float') }}}
			break;
		default:
#if OPENAL_DEBUG
			console.error("alGetListenerfv with param " + pname + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alGetListeneri: function(pname, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alGetListeneri called without a valid context");
#endif
			return;
		}
		switch (pname) {
		default:
#if OPENAL_DEBUG
			console.error("alGetListeneri with param " + pname + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alListenerf: function(param, value) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alListenerf called without a valid context");
#endif
			return;
		}
		switch (param) {
		case 0x100A /* AL_GAIN */:
			if (AL.currentCtx.gain.gain.value != value) AL.currentCtx.gain.gain.value = value;
			break;
		default:
#if OPENAL_DEBUG
			console.error("alListenerf with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alEnable: function(param) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alEnable called without a valid context");
#endif
			return;
		}
		switch (param) {
		default:
#if OPENAL_DEBUG
			console.error("alEnable with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alDisable: function(param) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alDisable called without a valid context");
#endif
			return;
		}
		switch (pname) {
		default:
#if OPENAL_DEBUG
			console.error("alDisable with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alListener3f: function(param, v1, v2, v3) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alListener3f called without a valid context");
#endif
			return;
		}
		switch (param) {
		case 0x1004 /* AL_POSITION */:
			AL.currentCtx.audioCtx.listener._position[0] = v1;
			AL.currentCtx.audioCtx.listener._position[1] = v2;
			AL.currentCtx.audioCtx.listener._position[2] = v3;
			AL.currentCtx.audioCtx.listener.setPosition(v1, v2, v3);
			break;
		case 0x1006 /* AL_VELOCITY */:
			AL.currentCtx.audioCtx.listener._velocity[0] = v1;
			AL.currentCtx.audioCtx.listener._velocity[1] = v2;
			AL.currentCtx.audioCtx.listener._velocity[2] = v3;
			// TODO: The velocity values are not currently used to implement a doppler effect.
			// If support for doppler effect is reintroduced, compute the doppler
			// speed pitch factor and apply it here.
			break;
		default:
#if OPENAL_DEBUG
			console.error("alListener3f with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alListenerfv: function(param, values) {
		if (!AL.currentCtx) {
#if OPENAL_DEBUG
			console.error("alListenerfv called without a valid context");
#endif
			return;
		}
		switch (param) {
		case 0x1004 /* AL_POSITION */:
			var x = {{{ makeGetValue('values', '0', 'float') }}};
			var y = {{{ makeGetValue('values', '4', 'float') }}};
			var z = {{{ makeGetValue('values', '8', 'float') }}};
			AL.currentCtx.audioCtx.listener._position[0] = x;
			AL.currentCtx.audioCtx.listener._position[1] = y;
			AL.currentCtx.audioCtx.listener._position[2] = z;
			AL.currentCtx.audioCtx.listener.setPosition(x, y, z);
			break;
		case 0x1006 /* AL_VELOCITY */:
			var x = {{{ makeGetValue('values', '0', 'float') }}};
			var y = {{{ makeGetValue('values', '4', 'float') }}};
			var z = {{{ makeGetValue('values', '8', 'float') }}};
			AL.currentCtx.audioCtx.listener._velocity[0] = x;
			AL.currentCtx.audioCtx.listener._velocity[1] = y;
			AL.currentCtx.audioCtx.listener._velocity[2] = z;
			// TODO: The velocity values are not currently used to implement a doppler effect.
			// If support for doppler effect is reintroduced, compute the doppler
			// speed pitch factor and apply it here.
			break;
		case 0x100F /* AL_ORIENTATION */:
			var x = {{{ makeGetValue('values', '0', 'float') }}};
			var y = {{{ makeGetValue('values', '4', 'float') }}};
			var z = {{{ makeGetValue('values', '8', 'float') }}};
			var x2 = {{{ makeGetValue('values', '12', 'float') }}};
			var y2 = {{{ makeGetValue('values', '16', 'float') }}};
			var z2 = {{{ makeGetValue('values', '20', 'float') }}};
			AL.currentCtx.audioCtx.listener._orientation[0] = x;
			AL.currentCtx.audioCtx.listener._orientation[1] = y;
			AL.currentCtx.audioCtx.listener._orientation[2] = z;
			AL.currentCtx.audioCtx.listener._orientation[3] = x2;
			AL.currentCtx.audioCtx.listener._orientation[4] = y2;
			AL.currentCtx.audioCtx.listener._orientation[5] = z2;
			AL.currentCtx.audioCtx.listener.setOrientation(x, y, z, x2, y2, z2);
			break;
		default:
#if OPENAL_DEBUG
			console.error("alListenerfv with param " + param + " not implemented yet");
#endif
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			break;
		}
	},

	alIsExtensionPresent: function(extName) {
		extName = Pointer_stringify(extName);

		if (extName == "AL_EXT_float32") return 1;

		return 0;
	},

	alcIsExtensionPresent: function(device, extName) {
		return 0;
	},

	alGetString: function(param) {
		if (AL.stringCache[param]) return AL.stringCache[param];
		var ret;
		switch (param) {
		case 0 /* AL_NO_ERROR */:
			ret = 'No Error';
			break;
		case 0xA001 /* AL_INVALID_NAME */:
			ret = 'Invalid Name';
			break;
		case 0xA002 /* AL_INVALID_ENUM */:
			ret = 'Invalid Enum';
			break;
		case 0xA003 /* AL_INVALID_VALUE */:
			ret = 'Invalid Value';
			break;
		case 0xA004 /* AL_INVALID_OPERATION */:
			ret = 'Invalid Operation';
			break;
		case 0xA005 /* AL_OUT_OF_MEMORY */:
			ret = 'Out of Memory';
			break;
		case 0xB001 /* AL_VENDOR */:
			ret = 'Emscripten';
			break;
		case 0xB002 /* AL_VERSION */:
			ret = '1.1';
			break;
		case 0xB003 /* AL_RENDERER */:
			ret = 'WebAudio';
			break;
		case 0xB004 /* AL_EXTENSIONS */:
			ret = 'AL_EXT_float32';
			break;
		default:
			AL.currentCtx.err = 0xA002 /* AL_INVALID_ENUM */;
			return 0;
		}

		ret = allocate(intArrayFromString(ret), 'i8', ALLOC_NORMAL);

		AL.stringCache[param] = ret;

		return ret;
	},

	alGetProcAddress: function(fname) {
		return 0;
	},

	alcGetString: function(device, param) {
		if (AL.alcStringCache[param]) return AL.alcStringCache[param];
		var ret;
		switch (param) {
		case 0 /* ALC_NO_ERROR */:
			ret = 'No Error';
			break;
		case 0xA001 /* ALC_INVALID_DEVICE */:
			ret = 'Invalid Device';
			break;
		case 0xA002 /* ALC_INVALID_CONTEXT */:
			ret = 'Invalid Context';
			break;
		case 0xA003 /* ALC_INVALID_ENUM */:
			ret = 'Invalid Enum';
			break;
		case 0xA004 /* ALC_INVALID_VALUE */:
			ret = 'Invalid Value';
			break;
		case 0xA005 /* ALC_OUT_OF_MEMORY */:
			ret = 'Out of Memory';
			break;
		case 0x1004 /* ALC_DEFAULT_DEVICE_SPECIFIER */:
			if (typeof(AudioContext) !== "undefined" ||
					typeof(webkitAudioContext) !== "undefined") {
				ret = 'Device';
			} else {
				return 0;
			}
			break;
		case 0x1005 /* ALC_DEVICE_SPECIFIER */:
			if (typeof(AudioContext) !== "undefined" ||
					typeof(webkitAudioContext) !== "undefined") {
				ret = 'Device\0';
			} else {
				ret = '\0';
			}
			break;
		case 0x311 /* ALC_CAPTURE_DEFAULT_DEVICE_SPECIFIER */:
			return 0;
			break;
		case 0x310 /* ALC_CAPTURE_DEVICE_SPECIFIER */:
			ret = '\0'
			break;
		case 0x1006 /* ALC_EXTENSIONS */:
			if (!device) {
				AL.alcErr = 0xA001 /* ALC_INVALID_DEVICE */;
				return 0;
			}
			ret = '';
			break;
		default:
			AL.alcErr = 0xA003 /* ALC_INVALID_ENUM */;
			return 0;
		}

		ret = allocate(intArrayFromString(ret), 'i8', ALLOC_NORMAL);

		AL.alcStringCache[param] = ret;

		return ret;
	},

	alcGetProcAddress: function(device, fname) {
		return 0;
	},

	alGetEnumValue: function(name) {
		name = Pointer_stringify(name);

		if (name == "AL_FORMAT_MONO_FLOAT32") return 0x10010;
		if (name == "AL_FORMAT_STEREO_FLOAT32") return 0x10011;

		AL.currentCtx.err = 0xA003 /* AL_INVALID_VALUE */;
		return 0;
	},

	alcGetEnumValue: function(device, name) {
		return 0;
	},

	alSpeedOfSound: function(value) {
		Runtime.warnOnce('alSpeedOfSound() is not yet implemented! Ignoring all calls to it.');
	},

	alDopplerFactor: function(value) {
		Runtime.warnOnce('alDopplerFactor() is not yet implemented! Ignoring all calls to it.');
	},

	alDopplerVelocity: function(value) {
		Runtime.warnOnce('alDopplerVelocity() is not yet implemented! Ignoring all calls to it.');
	}
};

autoAddDeps(LibraryOpenAL, '$AL');
mergeInto(LibraryManager.library, LibraryOpenAL);

