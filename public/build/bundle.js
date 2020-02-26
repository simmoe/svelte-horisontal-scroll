
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.19.1 */

    const file = "src/App.svelte";

    // (44:1) {#if position!=3}
    function create_if_block(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "←";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "→";
    			attr_dev(div0, "class", "arrow svelte-7qyfjw");
    			add_location(div0, file, 45, 2, 1180);
    			attr_dev(div1, "class", "arrow svelte-7qyfjw");
    			add_location(div1, file, 46, 2, 1235);
    			attr_dev(div2, "class", "abs svelte-7qyfjw");
    			add_location(div2, file, 44, 1, 1160);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_2*/ ctx[6], false, false, false),
    				listen_dev(div1, "click", /*click_handler_3*/ ctx[7], false, false, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(44:1) {#if position!=3}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div4;
    	let section0;
    	let h10;
    	let t1;
    	let section1;
    	let h11;
    	let t3;
    	let section2;
    	let h12;
    	let t5;
    	let section3;
    	let div3;
    	let h13;
    	let t7;
    	let div2;
    	let div0;
    	let t9;
    	let div1;
    	let t11;
    	let section4;
    	let h14;
    	let t13;
    	let section5;
    	let h15;
    	let t15;
    	let section6;
    	let h16;
    	let t17;
    	let dispose;
    	let if_block = /*position*/ ctx[1] != 3 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div4 = element("div");
    			section0 = element("section");
    			h10 = element("h1");
    			h10.textContent = "page 1";
    			t1 = space();
    			section1 = element("section");
    			h11 = element("h1");
    			h11.textContent = "page 2";
    			t3 = space();
    			section2 = element("section");
    			h12 = element("h1");
    			h12.textContent = "page 3";
    			t5 = space();
    			section3 = element("section");
    			div3 = element("div");
    			h13 = element("h1");
    			h13.textContent = "frontpage";
    			t7 = space();
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "go left";
    			t9 = space();
    			div1 = element("div");
    			div1.textContent = "go right";
    			t11 = space();
    			section4 = element("section");
    			h14 = element("h1");
    			h14.textContent = "page 4";
    			t13 = space();
    			section5 = element("section");
    			h15 = element("h1");
    			h15.textContent = "page 5";
    			t15 = space();
    			section6 = element("section");
    			h16 = element("h1");
    			h16.textContent = "page 6";
    			t17 = space();
    			if (if_block) if_block.c();
    			attr_dev(h10, "class", "svelte-7qyfjw");
    			add_location(h10, file, 27, 11, 690);
    			attr_dev(section0, "class", "svelte-7qyfjw");
    			add_location(section0, file, 27, 2, 681);
    			attr_dev(h11, "class", "svelte-7qyfjw");
    			add_location(h11, file, 28, 11, 727);
    			attr_dev(section1, "class", "svelte-7qyfjw");
    			add_location(section1, file, 28, 2, 718);
    			attr_dev(h12, "class", "svelte-7qyfjw");
    			add_location(h12, file, 29, 11, 764);
    			attr_dev(section2, "class", "svelte-7qyfjw");
    			add_location(section2, file, 29, 2, 755);
    			attr_dev(h13, "class", "svelte-7qyfjw");
    			add_location(h13, file, 32, 4, 818);
    			attr_dev(div0, "class", "door svelte-7qyfjw");
    			add_location(div0, file, 34, 5, 866);
    			attr_dev(div1, "class", "door svelte-7qyfjw");
    			add_location(div1, file, 35, 5, 929);
    			attr_dev(div2, "class", "doors svelte-7qyfjw");
    			add_location(div2, file, 33, 4, 841);
    			add_location(div3, file, 31, 3, 805);
    			attr_dev(section3, "class", "svelte-7qyfjw");
    			add_location(section3, file, 30, 2, 792);
    			attr_dev(h14, "class", "svelte-7qyfjw");
    			add_location(h14, file, 39, 11, 1032);
    			attr_dev(section4, "class", "svelte-7qyfjw");
    			add_location(section4, file, 39, 2, 1023);
    			attr_dev(h15, "class", "svelte-7qyfjw");
    			add_location(h15, file, 40, 11, 1069);
    			attr_dev(section5, "class", "svelte-7qyfjw");
    			add_location(section5, file, 40, 2, 1060);
    			attr_dev(h16, "class", "svelte-7qyfjw");
    			add_location(h16, file, 41, 11, 1106);
    			attr_dev(section6, "class", "svelte-7qyfjw");
    			add_location(section6, file, 41, 2, 1097);
    			attr_dev(div4, "class", "movable svelte-7qyfjw");
    			add_location(div4, file, 26, 1, 636);
    			attr_dev(main, "class", "svelte-7qyfjw");
    			add_location(main, file, 25, 0, 628);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, section0);
    			append_dev(section0, h10);
    			append_dev(div4, t1);
    			append_dev(div4, section1);
    			append_dev(section1, h11);
    			append_dev(div4, t3);
    			append_dev(div4, section2);
    			append_dev(section2, h12);
    			append_dev(div4, t5);
    			append_dev(div4, section3);
    			append_dev(section3, div3);
    			append_dev(div3, h13);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div4, t11);
    			append_dev(div4, section4);
    			append_dev(section4, h14);
    			append_dev(div4, t13);
    			append_dev(div4, section5);
    			append_dev(section5, h15);
    			append_dev(div4, t15);
    			append_dev(div4, section6);
    			append_dev(section6, h16);
    			/*div4_binding*/ ctx[5](div4);
    			append_dev(main, t17);
    			if (if_block) if_block.m(main, null);

    			dispose = [
    				listen_dev(div0, "click", /*click_handler*/ ctx[3], false, false, false),
    				listen_dev(div1, "click", /*click_handler_1*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*position*/ ctx[1] != 3) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*div4_binding*/ ctx[5](null);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let movable;

    	//position er den section vi ser nå
    	let position = 3;

    	//flyttefunksjon
    	const move = dir => {
    		$$invalidate(1, position = position + dir);

    		//ikke for langt...
    		if (position > 6 && dir > 0) $$invalidate(1, position = 6);

    		if (position < 0 && dir < 0) $$invalidate(1, position = 0);
    	};

    	const click_handler = () => move(-1);
    	const click_handler_1 = () => move(1);

    	function div4_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, movable = $$value);
    		});
    	}

    	const click_handler_2 = () => move(-1);
    	const click_handler_3 = () => move(1);
    	$$self.$capture_state = () => ({ movable, position, move });

    	$$self.$inject_state = $$props => {
    		if ("movable" in $$props) $$invalidate(0, movable = $$props.movable);
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*movable, position*/ 3) {
    			//$: betyr at alt inni kjører når noe forandrer sig
    			 {
    				//når DOM er klar
    				if (movable) {
    					//regn ut presis bredde på hver section
    					let w = movable.getBoundingClientRect().width / 7;

    					//flytt sections når position variablen endres
    					$$invalidate(0, movable.style.transform = `translateX(-${position * w}px)`, movable);
    				}
    			}
    		}
    	};

    	return [
    		movable,
    		position,
    		move,
    		click_handler,
    		click_handler_1,
    		div4_binding,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
