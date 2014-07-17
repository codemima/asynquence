/*! asynquence
 v0.5.2-g (c) Kyle Simpson
 MIT License: http://getify.mit-license.org
 */
// asynquence 大致是 async(异步), sequence(序列)的意思
// 介绍在这里: http://davidwalsh.name/asynquence-part-1
// GitHub源码在这里: https://github.com/getify/asynquence

// 括号表达式, (xxxxx) 是用来将内部的语句、表达式的结果作为一个结果.
// 常见的是讲json字符串用 eval 解析时,需要 eval("(" +jsonstr+ ")");
// () 内部定义了一个空间, 里面定义的变量不会污染到全局空间,很适合做lib
// (function UMD(对象/函数名name, 上下文this, 函数/对象的定义)) 返回一个匿名函数
// 因为第一个括号内 的结果是一个函数,而函数可以这样调用: (function(形参){})(实参);
// 这种匿名函数被浏览器解析后会自动执行一次.
(
	function UMD(name, context, definition) {
		if ( typeof module !== "undefined" && module.exports) {
			// 如果 module 存在,并且module.exports存在,则将赋值结果赋给 它
			// 可以不用管
			module.exports = definition();
		} else if ( typeof define === "function" && define.amd) {
			// 如果 define 这个函数存在,应该是另一个基础类库，则使用define
			// 可以不用管
			define(definition);
		} else {
			// 简单一点,可以看成: 调用传入的definition函数，将返回的对象绑定到全局空间
			// 当然,根据传入的上下文不同,也可以绑定到其他对象下面,成为一个属性.
			context[name] = definition(name, context);
		}
	}
)
(
	"ASQ"
	, this
	, function DEF(name, context) {"use strict";
// 上面的 use strict 表示严格语法模式,有错误就拒绝执行.
// 而普通的JS,是解释执行,不执行的地方,有些错误也不影响其他代码的执行
// 作为类库,使用严格模式是很有必要的.声明必须放到一个namespace空间的最起始处.
	var cycle, 
	scheduling_queue, 
	timer = ( typeof setImmediate !== "undefined") ? 
		function timer(fn) {
			return setImmediate(fn);
		} 
		: setTimeout
	;

	// Note: using a queue instead of array for efficiency
	function Queue() {
		var first, last, item;

		function Item(fn) {
			this.fn = fn;
			this.next =
			void 0;
		}

		return {
			add : function add(fn) {
				item = new Item(fn);
				if (last) {
					last.next = item;
				} else {
					first = item;
				}
				last = item;
				item =
				void 0;
			},
			drain : function drain() {
				var f = first;
				first = last = cycle = null;

				while (f) {
					f.fn();
					f = f.next;
				}
			}
		};
	}

	scheduling_queue = Queue();

	function schedule(fn) {
		scheduling_queue.add(fn);
		if (!cycle) {
			cycle = timer(scheduling_queue.drain);
		}
	}

	function tapSequence(def) {
		var trigger;

		// listen for signals from the sequence
		def.fn
		// note: cannot use `fn.pipe(trigger)` because we
		// need to be able to update the shared closure
		// to change `trigger`
		.val(function __val__() {
			trigger.apply(ø, arguments);
			return ASQmessages.apply(ø, arguments);
		}).or(function __or__() {
			trigger.fail.apply(ø, arguments);
		});

		// make a sequence to act as a proxy to the original
		// sequence
		def.fn = createSequence(function __create_sequence__(done) {
			// replace the temporary trigger (created below)
			// with this proxy's trigger
			trigger = done;
		}).defer();

		// temporary `trigger` which, if called before being replaced
		// above, creates replacement proxy sequence with the
		// success/error message(s) pre-injected
		trigger = function __trigger__() {
			def.fn = createSequence.apply(ø, arguments).defer();
		};
		trigger.fail = function __trigger_fail__() {
			var args = ARRAY_SLICE.call(arguments);
			def.fn = createSequence(function __create_sequence__(done) {
				done.fail.apply(ø, args);
			}).defer();
		};
	}

	// 最后要返回的对象/函数.
	function createSequence() {

		function scheduleSequenceTick() {
			if (seq_aborted) {
				sequenceTick();
			} else if (!seq_tick) {
				seq_tick = schedule(sequenceTick);
			}
		}

		function throwSequenceErrors() {
			throw (sequence_errors.length === 1 ? sequence_errors[0] : sequence_errors);
		}

		function sequenceTick() {
			var fn, args;

			seq_tick = null;
			// remove the temporary `unpause()` hook, if any
			delete sequence_api.unpause;

			if (seq_aborted) {
				clearTimeout(seq_tick);
				seq_tick = null;
				then_queue.length = or_queue.length = sequence_messages.length = sequence_errors.length = 0;
			} else if (seq_error) {
				if (or_queue.length === 0 && !error_reported) {
					error_reported = true;
					throwSequenceErrors();
				}

				while (or_queue.length) {
					error_reported = true;
					fn = or_queue.shift();
					try {
						fn.apply(ø, sequence_errors);
					} catch (err) {
						if (isMessageWrapper(err)) {
							sequence_errors = sequence_errors.concat(err);
						} else {
							sequence_errors.push(err);
							if (err.stack) {
								sequence_errors.push(err.stack);
							}
						}
						if (or_queue.length === 0) {
							throwSequenceErrors();
						}
					}
				}
			} else if (then_ready && then_queue.length > 0) {
				then_ready = false;
				fn = then_queue.shift();
				args = sequence_messages.slice();
				sequence_messages.length = 0;
				args.unshift(createStepCompletion());

				try {
					fn.apply(ø, args);
				} catch (err) {
					if (isMessageWrapper(err)) {
						sequence_errors = sequence_errors.concat(err);
					} else {
						sequence_errors.push(err);
					}
					seq_error = true;
					scheduleSequenceTick();
				}
			}
		}

		function createStepCompletion() {

			function done() {
				// ignore this call?
				if (seq_error || seq_aborted || then_ready) {
					return;
				}

				then_ready = true;
				sequence_messages.push.apply(sequence_messages, arguments);
				sequence_errors.length = 0;

				scheduleSequenceTick();
			}


			done.fail = function step$fail() {
				// ignore this call?
				if (seq_error || seq_aborted || then_ready) {
					return;
				}

				seq_error = true;
				sequence_messages.length = 0;
				sequence_errors.push.apply(sequence_errors, arguments);

				scheduleSequenceTick();
			};

			done.abort = function step$abort() {
				if (seq_error || seq_aborted) {
					return;
				}

				then_ready = false;
				seq_aborted = true;
				sequence_messages.length = sequence_errors.length = 0;

				scheduleSequenceTick();
			};

			// handles "error-first" (aka "node-style") callbacks
			done.errfcb = function step$errfcb(err) {
				if (err) {
					done.fail(err);
				} else {
					done.apply(ø, ARRAY_SLICE.call(arguments, 1));
				}
			};

			return done;
		}

		function createGate(stepCompletion, segments, seqMessages) {

			function resetGate() {
				clearTimeout(gate_tick);
				gate_tick = segment_completion = segment_messages = segment_error_message = null;
			}

			function scheduleGateTick() {
				if (gate_aborted) {
					return gateTick();
				}

				if (!gate_tick) {
					gate_tick = schedule(gateTick);
				}
			}

			function gateTick() {
				if (seq_error || seq_aborted || gate_completed) {
					return;
				}

				var msgs = [];

				gate_tick = null;

				if (gate_error) {
					stepCompletion.fail.apply(ø, segment_error_message);

					resetGate();
				} else if (gate_aborted) {
					stepCompletion.abort();

					resetGate();
				} else if (checkGate()) {
					gate_completed = true;

					// collect all the messages from the gate segments
					segment_completion.forEach(function __foreach__(sc, i) {
						msgs.push(segment_messages["s" + i]);
					});

					stepCompletion.apply(ø, msgs);

					resetGate();
				}
			}

			function checkGate() {
				if (segment_completion.length === 0) {
					return;
				}

				var fulfilled = true;

				segment_completion.some(function __some__(segcom) {
					if (segcom === null) {
						fulfilled = false;
						return true;
						// break
					}
				});

				return fulfilled;
			}

			function createSegmentCompletion() {

				function done() {
					// ignore this call?
					if (seq_error || seq_aborted || gate_error || gate_aborted || gate_completed || segment_completion[segment_completion_idx]) {
						return;
					}

					// put gate-segment messages into `messages`-branded
					// container
					var args = ASQmessages.apply(ø, arguments);

					segment_messages["s" + segment_completion_idx] = args.length > 1 ? args : args[0];
					segment_completion[segment_completion_idx] = true;

					scheduleGateTick();
				}

				var segment_completion_idx = segment_completion.length;

				done.fail = function segment$fail() {
					// ignore this call?
					if (seq_error || seq_aborted || gate_error || gate_aborted || gate_completed || segment_completion[segment_completion_idx]) {
						return;
					}

					gate_error = true;
					segment_error_message = ARRAY_SLICE.call(arguments);

					scheduleGateTick();
				};

				done.abort = function segment$abort() {
					if (seq_error || seq_aborted || gate_error || gate_aborted || gate_completed) {
						return;
					}

					gate_aborted = true;

					// abort() is an immediate/synchronous action
					gateTick();
				};

				// handles "error-first" (aka "node-style") callbacks
				done.errfcb = function segment$errfcb(err) {
					if (err) {
						done.fail(err);
					} else {
						done.apply(ø, ARRAY_SLICE.call(arguments, 1));
					}
				};

				// placeholder for when a gate-segment completes
				segment_completion[segment_completion_idx] = null;

				return done;
			}

			var gate_error = false, gate_aborted = false, gate_completed = false, args, err_msg, segment_completion = [], segment_messages = {}, segment_error_message, gate_tick;

			segments.some(function __some__(seg) {
				if (gate_error || gate_aborted) {
					return true;
					// break
				}

				args = seqMessages.slice();
				args.unshift(createSegmentCompletion());
				try {
					seg.apply(ø, args);
				} catch (err) {
					err_msg = err;
					gate_error = true;
					return true;
					// break
				}
			});

			if (err_msg) {
				if (isMessageWrapper(err_msg)) {
					stepCompletion.fail.apply(ø, err_msg);
				} else {
					stepCompletion.fail(err_msg);
				}
			}
		}

		function then() {
			if (seq_error || seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			wrapArgs(arguments, thenWrapper).forEach(function __foreach__(fn) {
				if (isSequence(fn)) {
					seq(fn);
				} else {
					then_queue.push(fn);
				}
			});

			scheduleSequenceTick();

			return sequence_api;
		}

		function or() {
			if (seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			or_queue.push.apply(or_queue, arguments);

			scheduleSequenceTick();

			return sequence_api;
		}

		function gate() {
			if (seq_error || seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			var fns = ARRAY_SLICE.call(arguments)
			// map any sequences to gate segments
			.map(function __map__(fn) {
				var def;

				// is `fn` a sequence or iterable-sequence?
				if (isSequence(fn)) {
					def = {
						fn : fn
					};
					tapSequence(def);
					return function __segment__(done) {
						def.fn.pipe(done);
					};
				} else
					return fn;
			});

			then(function __then__(done) {
				var args = ARRAY_SLICE.call(arguments, 1);
				createGate(done, fns, args);
			});

			return sequence_api;
		}

		function pipe() {
			if (seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			ARRAY_SLICE.call(arguments).forEach(function __foreach__(fn) {
				then(function __then__(done) {
					fn.apply(ø, ARRAY_SLICE.call(arguments, 1));
					done();
				}).or(fn.fail);
			});

			return sequence_api;
		}

		function seq() {
			if (seq_error || seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			ARRAY_SLICE.call(arguments).forEach(function __foreach__(fn) {
				var def = {
					fn : fn
				};

				// is `fn` a sequence or iterable-sequence?
				if (isSequence(fn)) {
					tapSequence(def);
				}

				then(function __then__(done) {
					var _fn = def.fn;
					// check if this argument is not already a sequence?
					// if not, assume a function to invoke that will return
					// a sequence.
					if (!isSequence(def.fn)) {
						_fn = def.fn.apply(ø, ARRAY_SLICE.call(arguments, 1));
					}
					// pipe the provided sequence into our current sequence
					_fn.pipe(done);
				});
			});

			return sequence_api;
		}

		function val() {
			if (seq_error || seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			ARRAY_SLICE.call(wrapArgs(arguments, valWrapper)).forEach(function __foreach__(fn) {
				then(function __then__(done) {
					var msgs = fn.apply(ø, ARRAY_SLICE.call(arguments, 1));
					if (!isMessageWrapper(msgs)) {
						msgs = ASQmessages(msgs);
					}
					done.apply(ø, msgs);
				});
			});

			return sequence_api;
		}

		function promise() {
			function wrap(fn) {
				return function __fn__() {
					fn.apply(ø, isMessageWrapper(arguments[0]) ? arguments[0] : arguments);
				};
			}

			if (seq_error || seq_aborted || arguments.length === 0) {
				return sequence_api;
			}

			ARRAY_SLICE.call(arguments).forEach(function __foreach__(pr) {
				then(function __then__(done) {
					var _pr = pr;
					// check if this argument is a non-thenable function, and
					// if so, assume we shold invoke it to return a promise
					// NOTE: `then` duck-typing of promises is stupid.
					if ( typeof pr === "function" && !("then" in pr)) {
						_pr = pr.apply(ø, ARRAY_SLICE.call(arguments, 1));
					}
					// now, hook up the promise to the sequence
					_pr.then(wrap(done), wrap(done.fail));
				});
			});

			return sequence_api;
		}

		function fork() {
			var trigger;

			// listen for success at this point in the sequence
			val(function __val__() {
				if (trigger) {
					trigger.apply(ø, arguments);
				} else {
					trigger = createSequence.apply(ø, arguments).defer();
				}
				return ASQmessages.apply(ø, arguments);
			});
			// listen for error at this point in the sequence
			or(function __or__() {
				if (trigger) {
					trigger.fail.apply(ø, arguments);
				} else {
					var args = ARRAY_SLICE.call(arguments);
					trigger = createSequence().then(function __then__(done) {
						done.fail.apply(ø, args);
					}).defer();
				}
			});

			// create the forked sequence which will receive
			// the success/error stream from the main sequence
			return createSequence().then(function __then__(done) {
				if (!trigger) {
					trigger = done;
				} else {
					trigger.pipe(done);
				}
			}).defer();
		}

		function abort() {
			if (seq_error) {
				return sequence_api;
			}

			seq_aborted = true;

			sequenceTick();

			return sequence_api;
		}

		function duplicate() {
			var sq;

			template = {
				then_queue : then_queue.slice(),
				or_queue : or_queue.slice()
			};
			sq = createSequence();
			template = null;

			return sq;
		}

		function unpause() {
			sequence_messages.push.apply(sequence_messages, arguments);
			if (seq_tick === true)
				seq_tick = null;
			scheduleSequenceTick();
		}

		// opt-out of global error reporting for this sequence
		function defer() {
			or_queue.push(function ignored() {
			});
			return sequence_api;
		}

		function internals(name, value) {
			var set = (arguments.length > 1);
			switch (name) {
				case "seq_error":
					if (set) {
						seq_error = value;
					} else {
						return seq_error;
					}
					break;
				case "seq_aborted":
					if (set) {
						seq_aborted = value;
					} else {
						return seq_aborted;
					}
					break;
				case "then_ready":
					if (set) {
						then_ready = value;
					} else {
						return then_ready;
					}
					break;
				case "then_queue":
					return then_queue;
				case "or_queue":
					return or_queue;
				case "sequence_messages":
					return sequence_messages;
				case "sequence_errors":
					return sequence_errors;
			}
		}

		function includeExtensions() {
			Object.keys(extensions).forEach(function __foreach__(name) {
				sequence_api[name] = extensions[name](sequence_api, internals);
			});
		}

		var seq_error = false, error_reported = false, seq_aborted = false, then_ready = true, then_queue = [], or_queue = [], sequence_messages = [], sequence_errors = [], seq_tick,

		// brand the sequence API so we can detect ASQ instances
		sequence_api = brandIt({
			then : then,
			or : or,
			gate : gate,
			// alias of `gate(..)` to `all(..)` for symmetry
			// with native ES6 promises
			all : gate,
			pipe : pipe,
			seq : seq,
			val : val,
			promise : promise,
			fork : fork,
			abort : abort,
			duplicate : duplicate,
			defer : defer
		});

		// include any extensions
		includeExtensions();

		// templating the sequence setup?
		if (template) {
			then_queue = template.then_queue.slice();
			or_queue = template.or_queue.slice();

			// templating a sequence starts it out paused
			// add temporary `unpause()` API hook
			sequence_api.unpause = unpause;
			seq_tick = true;
		}

		// treat ASQ() constructor parameters as having been
		// passed to `then()`
		sequence_api.then.apply(ø, arguments);

		return sequence_api;
	}

	// ***********************************************
	// Object branding utilities
	// ***********************************************
	function brandIt(obj) {
		return Object.defineProperty(obj, brand, {
			enumerable : false,
			value : true
		});
	}

	function checkBranding(val) {
		return val != null && typeof val === "object" && val[brand];
	}

	// ***********************************************
	// Value messages utilities
	// ***********************************************
	// wrapper helpers
	function valWrapper(numArgs) {
		// `numArgs` indicates how many pre-bound arguments
		// will be sent in.
		return ASQmessages.apply(ø,
		// pass along only the pre-bound arguments
		ARRAY_SLICE.call(arguments).slice(1, numArgs + 1));
	}

	function thenWrapper(numArgs) {
		// Because of bind() partial-application, will
		// receive pre-bound arguments before the `done()`,
		// rather than it being first as usual.
		// `numArgs` indicates how many pre-bound arguments
		// will be sent in.
		arguments[numArgs + 1]// the `done()`
		.apply(ø,
		// pass along only the pre-bound arguments
		ARRAY_SLICE.call(arguments).slice(1, numArgs + 1));
	}

	function wrapArgs(args, wrapper) {
		var i, j;
		args = ARRAY_SLICE.call(args);
		for ( i = 0; i < args.length; i++) {
			if (isMessageWrapper(args[i])) {
				args[i] = wrapper.bind.apply(wrapper,
				// partial-application of arguments
				[
				/*this=*/null, /*numArgs=*/
				args[i].length].concat(
				// pre-bound arguments
				args[i]));
			} else if ( typeof args[i] !== "function" && (wrapper === valWrapper || !isSequence(args[i])
			)) {
				for ( j = i + 1; j < args.length; j++) {
					if ( typeof args[j] === "function" || checkBranding(args[j])) {
						break;
					}
				}
				args.splice(
				/*start=*/i,
				/*howMany=*/j - i,
				/*replace=*/
				wrapper.bind.apply(wrapper,
				// partial-application of arguments
				[
				/*this=*/null, /*numArgs=*/(j - i)].concat(
				// pre-bound arguments
				args.slice(i, j))));
			}
		}
		return args;
	}

	var extensions = {}, 
		template, 
		// 先保存下来原来的 "现场",也就是那个名字,如果有冲突,可以调用 noConflict
		// jQuery 也是这么干的,算是一个约定
		old_public_api = (context || {})[name], 
		ARRAY_SLICE = [].slice, 
		brand = "__ASQ__",
		ø = Object.create(null),
		ASQmessages, isSequence, isMessageWrapper;

	// ***********************************************
	// Setup the public API
	// 设置公共API，注意这里不是 设置原型哦,所以外面是不能 new 的.
	// ***********************************************
	createSequence.failed = function publicAPI$failed() {
		var args = ASQmessages.apply(ø, arguments);
		return createSequence(function $failed$() {
			throw args;
		}).defer();
	};

	createSequence.extend = function publicAPI$extend(name, build) {
		// reserved API override not allowed
		if (!~["then", "or", "gate", "all", "pipe", "seq", "val", "promise", "fork", "abort", "duplicate", "defer"].indexOf(name)) {
			extensions[name] = build;
		}

		return createSequence;
	};

	createSequence.messages = ASQmessages = function publicAPI$messages() {
		var ret = ARRAY_SLICE.call(arguments);
		// brand the message wrapper so we can detect
		return brandIt(ret);
	};

	createSequence.isSequence = isSequence = function publicAPI$isSequence(val) {
		return checkBranding(val) && !Array.isArray(val);
	};

	createSequence.isMessageWrapper = isMessageWrapper = function publicAPI$isMessageWrapper(val) {
			return checkBranding(val) && Array.isArray(val);
		};

	createSequence.unpause = function publicAPI$unpause(sq) {
		if (sq.unpause)
			sq.unpause();
		return sq;
	};

	// 避免全局命名空间冲突
	createSequence.noConflict = function publicAPI$noConflict() {
		if (context) {
			// 将那个 name还原回原来的对象
			context[name] = old_public_api;
		}
		// 返回自身,由调用的代码自己持有,保存,或赋值给某个变量
		return createSequence;
	};

	// private utility exports: only for internal/plugin use!
	// 两个下划线打头,标识这是私有的,外部的代码不应该调用/使用这两个方法.
	createSequence.__schedule = schedule;
	createSequence.__tapSequence = tapSequence;
	
	// 返回的对象,会被绑定到 ASQ 之类的名字上,在外部就引用了此对象,
	// 因为闭包特性,可以利用到闭包内部方法和内部对象。 lib一般都是利用这种闭包特性,维护私有的属性、对象,
	// 对外只暴露一些方法(API),也就是 function, 外面只能调用这些API,方便内部进行逻辑控制,降低依赖.
	return createSequence;
});
